import {
  ADD_GAME_MINUTES_PER_RUNTIME_SECOND,
  ADD_TRAVEL_GAME_MINUTES_PER_TILE,
  ADD_TRAVEL_RUNTIME_SECONDS_PER_TILE,
} from "@aedventure/add-domain"

export interface AddTravelPresentationTiming {
  readonly visibleGameMinutes: number
  readonly runtimeSeconds: number
  readonly durationMs: number
  readonly msPerVisibleMinute: number
  readonly runtimeSecondsPerVisibleMinute: number
}

export const ADD_TRAVEL_PRESENTATION_MS_PER_VISIBLE_MINUTE = 30

export const ADD_TILE_TRAVEL_PRESENTATION = createAddTravelPresentationTiming(
  ADD_TRAVEL_GAME_MINUTES_PER_TILE,
  ADD_TRAVEL_RUNTIME_SECONDS_PER_TILE,
)

export function createAddClockAdvancePresentationTiming(
  fromClockSeconds: number,
  toClockSeconds: number,
): AddTravelPresentationTiming {
  const fromVisibleMinute = Math.floor(
    Math.max(0, fromClockSeconds) * ADD_GAME_MINUTES_PER_RUNTIME_SECOND,
  )
  const toVisibleMinute = Math.floor(
    Math.max(0, toClockSeconds) * ADD_GAME_MINUTES_PER_RUNTIME_SECOND,
  )
  const visibleGameMinutes = Math.max(0, toVisibleMinute - fromVisibleMinute)
  return createAddTravelPresentationTiming(
    visibleGameMinutes,
    Math.max(0, toClockSeconds - fromClockSeconds),
  )
}

function createAddTravelPresentationTiming(
  visibleGameMinutes: number,
  runtimeSeconds: number,
): AddTravelPresentationTiming {
  return {
    visibleGameMinutes,
    runtimeSeconds,
    durationMs: visibleGameMinutes * ADD_TRAVEL_PRESENTATION_MS_PER_VISIBLE_MINUTE,
    msPerVisibleMinute: ADD_TRAVEL_PRESENTATION_MS_PER_VISIBLE_MINUTE,
    runtimeSecondsPerVisibleMinute:
      ADD_GAME_MINUTES_PER_RUNTIME_SECOND <= 0
        ? 1
        : 1 / ADD_GAME_MINUTES_PER_RUNTIME_SECOND,
  }
}
