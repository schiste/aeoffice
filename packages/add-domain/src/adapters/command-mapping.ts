import type { GameInteraction } from "@aedventure/game-world"

import type { WorkerRequest } from "../runtime/protocol"

export type AddDomainCommand =
  | { readonly kind: "start_world_action"; readonly actionId: string }
  | { readonly kind: "choose_story_option"; readonly beatId: string; readonly optionId: string }
  | { readonly kind: "assign_hero"; readonly assigned: boolean }
  | { readonly kind: "recruit_from_survivor_cave" }

export function workerRequestForAddCommand(command: AddDomainCommand): WorkerRequest {
  switch (command.kind) {
    case "start_world_action":
      return { type: "startWorldAction", actionId: command.actionId }
    case "choose_story_option":
      return {
        type: "chooseStoryOption",
        beatId: command.beatId,
        optionId: command.optionId,
      }
    case "assign_hero":
      return { type: "assignHero", assigned: command.assigned }
    case "recruit_from_survivor_cave":
      return { type: "recruitFromSurvivorCave" }
  }
}

export function addCommandForGameInteraction(
  interaction: GameInteraction,
): AddDomainCommand | null {
  switch (interaction.action) {
    case "add.start_world_action": {
      const actionId = stringMetadata(interaction, "actionId")
      return actionId ? { kind: "start_world_action", actionId } : null
    }
    case "add.choose_story_option": {
      const beatId = stringMetadata(interaction, "beatId")
      const optionId = stringMetadata(interaction, "optionId")
      return beatId && optionId
        ? { kind: "choose_story_option", beatId, optionId }
        : null
    }
    case "add.assign_hero": {
      const assigned = booleanMetadata(interaction, "assigned")
      return assigned === undefined ? null : { kind: "assign_hero", assigned }
    }
    case "add.recruit_from_survivor_cave":
      return { kind: "recruit_from_survivor_cave" }
    default:
      return null
  }
}

function stringMetadata(
  interaction: GameInteraction,
  key: string,
): string | undefined {
  const value = interaction.metadata?.[key]
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function booleanMetadata(
  interaction: GameInteraction,
  key: string,
): boolean | undefined {
  const value = interaction.metadata?.[key]
  return typeof value === "boolean" ? value : undefined
}
