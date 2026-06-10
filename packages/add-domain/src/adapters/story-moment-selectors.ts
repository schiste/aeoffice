import type { CatalogSnapshot, SimulationSnapshot } from "../runtime/protocol"

// Projects the authoritative active story beat (selected by the Rust salience
// engine) into a presentable "moment": its body + ALL of its choices, so the UI
// can surface real agency instead of a single hardcoded option. The engine owns
// selection + effects; this is render-only.

export interface AddStoryMomentChoice {
  readonly id: string
  readonly label: string
}

export interface AddStoryMoment {
  readonly beatId: string
  readonly label: string
  readonly body: string
  readonly arc: string
  /** Choices to offer right now (empty once the player has chosen, or for beats
   * that are an ongoing goal rather than a decision). */
  readonly choices: readonly AddStoryMomentChoice[]
  /** True when this beat is a decision still awaiting the player's pick. */
  readonly awaitingChoice: boolean
}

export function selectAddStoryMoment(
  snapshot: SimulationSnapshot,
  catalog: CatalogSnapshot,
): AddStoryMoment | null {
  const beatId = snapshot.narrative.activeBeatId
  if (!beatId) return null
  const beat = catalog.storyBeats.find((candidate) => candidate.id === beatId)
  if (!beat) return null

  const alreadyChosen = Boolean(snapshot.narrative.choiceByBeat[beatId])
  const awaitingChoice = beat.choices.length > 0 && !alreadyChosen
  return {
    beatId,
    label: beat.label,
    body: beat.body,
    arc: beat.arc,
    choices: awaitingChoice ? beat.choices.map((choice) => ({ id: choice.id, label: choice.label })) : [],
    awaitingChoice,
  }
}
