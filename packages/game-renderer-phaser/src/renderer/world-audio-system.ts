import Phaser from "phaser"

import type {
  RenderedPlayer,
  RendererAudioCueId,
  RendererAudioInfo,
  RendererWorldInteractionInfo,
  RendererZoneInteractionState,
  Vector2,
} from "./types"

type AudioManager = Phaser.Sound.NoAudioSoundManager |
  Phaser.Sound.HTML5AudioSoundManager |
  Phaser.Sound.WebAudioSoundManager

interface CueDefinition {
  readonly id: RendererAudioCueId
  readonly frequencyHz: number
  readonly durationMs: number
  readonly gain: number
  readonly waveform: "sine" | "triangle" | "noise"
  readonly volume: number
}

const CUE_DEFINITIONS: readonly CueDefinition[] = [
  {
    id: "footstep",
    frequencyHz: 140,
    durationMs: 54,
    gain: 0.34,
    waveform: "noise",
    volume: 0.18,
  },
  {
    id: "door_open",
    frequencyHz: 330,
    durationMs: 150,
    gain: 0.22,
    waveform: "triangle",
    volume: 0.23,
  },
  {
    id: "zone_enter",
    frequencyHz: 520,
    durationMs: 96,
    gain: 0.18,
    waveform: "sine",
    volume: 0.18,
  },
  {
    id: "blocked_movement",
    frequencyHz: 96,
    durationMs: 88,
    gain: 0.32,
    waveform: "triangle",
    volume: 0.2,
  },
  {
    id: "chat_notification",
    frequencyHz: 660,
    durationMs: 120,
    gain: 0.15,
    waveform: "sine",
    volume: 0.16,
  },
  {
    id: "map_transition",
    frequencyHz: 440,
    durationMs: 180,
    gain: 0.16,
    waveform: "triangle",
    volume: 0.18,
  },
]

const CUE_IDS = CUE_DEFINITIONS.map((cue) => cue.id)
const AUDIO_KEY_PREFIX = "aedventure.world-ui"
const FOOTSTEP_THROTTLE_MS = 185
const LOCAL_STEP_DISTANCE_PX = 10
const MAX_CONCURRENT_UI_SOUNDS = 6

export class WorldAudioSystem {
  private initialized = false
  private decodedCueIds = new Set<RendererAudioCueId>()
  private failedCueIds = new Set<RendererAudioCueId>()
  private activeZoneIds = new Set<string>()
  private activeDoorCandidateIds = new Set<string>()
  private lastLocalPosition?: Vector2
  private lastFootstepAtMs = -Infinity
  private playCountByCue = emptyPlayCountByCue()
  private attemptedPlayCount = 0
  private successfulPlayCount = 0
  private blockedByLockCount = 0
  private skippedUnavailableCount = 0
  private lastCueId?: RendererAudioCueId
  private lastCueAtMs?: number

  constructor(private readonly scene: Phaser.Scene) {}

  initialize(): void {
    if (this.initialized) return
    this.initialized = true
    this.scene.sound.volume = Math.min(this.scene.sound.volume, 0.42)
    this.installDecodeListeners()
    this.decodeGeneratedCues()
  }

  resetWorldState(): void {
    this.activeZoneIds.clear()
    this.activeDoorCandidateIds.clear()
    this.lastLocalPosition = undefined
    this.lastFootstepAtMs = -Infinity
  }

  observePlayers(players: readonly RenderedPlayer[]): void {
    const localPlayer = players.find((player) => player.local)

    if (!localPlayer) {
      this.lastLocalPosition = undefined
      return
    }

    if (localPlayer.rejected) {
      this.playCue("blocked_movement")
    }

    const previous = this.lastLocalPosition
    this.lastLocalPosition = localPlayer.position
    if (!previous) return

    const movedPx = Math.hypot(
      localPlayer.position.x - previous.x,
      localPlayer.position.y - previous.y,
    )
    const now = this.scene.time.now
    const throttleMs = localPlayer.movementMode === "run"
      ? FOOTSTEP_THROTTLE_MS * 0.72
      : FOOTSTEP_THROTTLE_MS

    if (
      movedPx >= LOCAL_STEP_DISTANCE_PX &&
      now - this.lastFootstepAtMs >= throttleMs
    ) {
      this.playCue("footstep")
      this.lastFootstepAtMs = now
    }
  }

  observeZoneInteractionState(state: RendererZoneInteractionState): void {
    const nextActiveZones = new Set(state.activeZoneIds)
    const enteredZone = [...nextActiveZones].some(
      (zoneId) => !this.activeZoneIds.has(zoneId),
    )

    this.activeZoneIds = nextActiveZones
    if (enteredZone) {
      this.playCue("zone_enter")
    }
  }

  observeWorldInteractions(info: RendererWorldInteractionInfo): void {
    const nextDoorCandidateIds = new Set(
      info.candidates
        .filter((candidate) =>
          candidate.active &&
          candidate.serverPermitted &&
          candidate.markerVisible &&
          (candidate.action === "open_door" ||
            candidate.action === "enter_portal")
        )
        .map((candidate) => candidate.id),
    )
    const doorBecameAvailable = [...nextDoorCandidateIds].some(
      (candidateId) => !this.activeDoorCandidateIds.has(candidateId),
    )

    this.activeDoorCandidateIds = nextDoorCandidateIds
    if (doorBecameAvailable) {
      this.playCue("door_open")
    }
  }

  noteMapRendered(): void {
    this.playCue("map_transition")
  }

  playCue(cueId: RendererAudioCueId): void {
    this.attemptedPlayCount += 1
    this.playCountByCue = {
      ...this.playCountByCue,
      [cueId]: this.playCountByCue[cueId] + 1,
    }
    this.lastCueId = cueId
    this.lastCueAtMs = Math.round(this.scene.time.now)

    if (this.scene.sound.locked) {
      this.blockedByLockCount += 1
      return
    }

    if (!this.decodedCueIds.has(cueId) || this.scene.sound.mute) {
      this.skippedUnavailableCount += 1
      return
    }

    if (this.scene.sound.getAllPlaying().length >= MAX_CONCURRENT_UI_SOUNDS) {
      this.skippedUnavailableCount += 1
      return
    }

    const started = this.scene.sound.play(audioKey(cueId), {
      volume: cueDefinition(cueId).volume,
    })

    if (started) {
      this.successfulPlayCount += 1
    } else {
      this.skippedUnavailableCount += 1
    }
  }

  getInfo(): RendererAudioInfo {
    const manager = this.scene.sound
    const decodedCueIds = CUE_IDS.filter((cueId) =>
      this.decodedCueIds.has(cueId),
    )

    return {
      source: "phaser_sound_manager",
      authority: "world_ui_audio_only",
      enabled: true,
      manager: {
        type: managerType(manager),
        locked: manager.locked,
        muted: manager.mute,
        volume: Number(manager.volume.toFixed(2)),
        pauseOnBlur: manager.pauseOnBlur,
      },
      assets: {
        strategy: "generated_wav_data_uri",
        registeredCueCount: CUE_IDS.length,
        decodedCueCount: decodedCueIds.length,
        pendingCueCount: Math.max(
          0,
          CUE_IDS.length - decodedCueIds.length - this.failedCueIds.size,
        ),
        failedCueCount: this.failedCueIds.size,
        generatedCueIds: CUE_IDS,
        decodedCueIds,
      },
      cues: {
        supportedCueIds: CUE_IDS,
        eventBindings: [
          "local_player_step",
          "portal_or_door_available",
          "zone_entered",
          "movement_rejected",
          "chat_delivered",
          "map_rendered",
        ],
        playCountByCue: this.playCountByCue,
        attemptedPlayCount: this.attemptedPlayCount,
        successfulPlayCount: this.successfulPlayCount,
        blockedByLockCount: this.blockedByLockCount,
        skippedUnavailableCount: this.skippedUnavailableCount,
        lastCueId: this.lastCueId,
        lastCueAtMs: this.lastCueAtMs,
      },
      routing: {
        realtimeStreamsHandledOutsidePhaser: true,
        realtimeStreamLayer: "external_browser_runtime",
        spatialWorldUiOnly: true,
      },
      policy: {
        autoplay: "play_after_unlock_else_track_attempt",
        footstepThrottleMs: FOOTSTEP_THROTTLE_MS,
        maxConcurrentUiSounds: MAX_CONCURRENT_UI_SOUNDS,
      },
    }
  }

  private installDecodeListeners(): void {
    this.scene.sound.on(Phaser.Sound.Events.DECODED, (key: string) => {
      const cueId = cueIdFromAudioKey(key)
      if (cueId) {
        this.decodedCueIds.add(cueId)
        this.failedCueIds.delete(cueId)
      }
    })
  }

  private decodeGeneratedCues(): void {
    const manager = this.scene.sound as AudioManager & {
      decodeAudio?: (
        audioKey?: Phaser.Types.Sound.DecodeAudioConfig[] | string,
        audioData?: ArrayBuffer | string,
      ) => void
    }

    if (typeof manager.decodeAudio !== "function") return

    try {
      manager.decodeAudio(
        CUE_DEFINITIONS.map((cue) => ({
          key: audioKey(cue.id),
          data: generatedWavDataUri(cue),
        })),
      )
    } catch {
      CUE_IDS.forEach((cueId) => this.failedCueIds.add(cueId))
    }
  }
}

function emptyPlayCountByCue(): Record<RendererAudioCueId, number> {
  return {
    footstep: 0,
    door_open: 0,
    zone_enter: 0,
    blocked_movement: 0,
    chat_notification: 0,
    map_transition: 0,
  }
}

function cueDefinition(cueId: RendererAudioCueId): CueDefinition {
  const definition = CUE_DEFINITIONS.find((cue) => cue.id === cueId)
  if (!definition) throw new Error(`Unknown renderer audio cue: ${cueId}`)
  return definition
}

function audioKey(cueId: RendererAudioCueId): string {
  return `${AUDIO_KEY_PREFIX}.${cueId}`
}

function cueIdFromAudioKey(key: string): RendererAudioCueId | undefined {
  const rawCueId = key.replace(`${AUDIO_KEY_PREFIX}.`, "")
  return CUE_IDS.includes(rawCueId as RendererAudioCueId)
    ? rawCueId as RendererAudioCueId
    : undefined
}

function managerType(manager: AudioManager): RendererAudioInfo["manager"]["type"] {
  const name = manager.constructor?.name?.toLowerCase() ?? ""
  if (name.includes("webaudio")) return "web_audio"
  if (name.includes("html5")) return "html5_audio"
  if (name.includes("noaudio")) return "no_audio"
  return "unknown"
}

function generatedWavDataUri(cue: CueDefinition): string {
  const sampleRate = 22050
  const sampleCount = Math.max(1, Math.floor(sampleRate * cue.durationMs / 1000))
  const buffer = new ArrayBuffer(44 + sampleCount * 2)
  const view = new DataView(buffer)

  writeAscii(view, 0, "RIFF")
  view.setUint32(4, 36 + sampleCount * 2, true)
  writeAscii(view, 8, "WAVE")
  writeAscii(view, 12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, "data")
  view.setUint32(40, sampleCount * 2, true)

  for (let index = 0; index < sampleCount; index += 1) {
    const t = index / sampleRate
    const progress = index / sampleCount
    const envelope = Math.sin(Math.PI * progress)
    const value = waveformSample(cue, t, index) * cue.gain * envelope

    view.setInt16(
      44 + index * 2,
      Math.max(-1, Math.min(1, value)) * 32767,
      true,
    )
  }

  return `data:audio/wav;base64,${arrayBufferToBase64(buffer)}`
}

function waveformSample(
  cue: CueDefinition,
  t: number,
  index: number,
): number {
  if (cue.waveform === "noise") {
    const noise = Math.sin(index * 12.9898 + cue.frequencyHz) * 43758.5453
    return (noise - Math.floor(noise)) * 2 - 1
  }

  const phase = (t * cue.frequencyHz) % 1
  if (cue.waveform === "triangle") {
    return 1 - 4 * Math.abs(Math.round(phase - 0.25) - (phase - 0.25))
  }

  return Math.sin(Math.PI * 2 * cue.frequencyHz * t)
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index))
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return window.btoa(binary)
}
