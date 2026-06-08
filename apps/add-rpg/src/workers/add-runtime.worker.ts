/// <reference lib="webworker" />

import type { CatalogSnapshot, SimulationSnapshot, WorkerEvent, WorkerRequest } from "@aedventure/add-domain"
import init, { WebRuntime } from "../generated/wasm/add-web-bindings/runtime"

let runtime: WebRuntime | null = null
let runtimeReady: Promise<void> | null = null

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  void handleMessage(event.data)
})

async function handleMessage(message: WorkerRequest) {
  try {
    await ensureRuntime()

    switch (message.type) {
      case 'init':
        runtime = new WebRuntime()
        postWorkerEvent({ type: 'ready', snapshot: snapshot(), catalog: catalog() })
        break
      case 'reset':
        runtime = new WebRuntime()
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'tick':
        runtime?.tick(message.seconds)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'chooseStoryOption':
        runtime?.chooseStoryOption(message.beatId, message.optionId)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'assignHero':
        runtime?.assignHero(message.assigned)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'setHeroRole':
        runtime?.setHeroRole(message.roleId)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'setRoleCrew':
        runtime?.setRoleCrew(message.roleId, message.crew)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'setStationEnabled':
        runtime?.setStationEnabled(message.stationId, message.enabled)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'offlineCatchup':
        runtime?.runOfflineCatchup(message.elapsedSeconds)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'startWorldAction':
        runtime?.startWorldAction(message.actionId)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'startConstruction':
        runtime?.startConstruction(message.optionId)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'startProcessing':
        runtime?.startProcessing(message.recipeId)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'recruitFromSurvivorCave':
        runtime?.recruitFromSurvivorCave()
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'moveHeroTo':
        runtime?.moveHeroTo(message.q, message.r)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'openDoor':
        runtime?.openDoor(message.key)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'acquirePerk':
        runtime?.acquirePerk(message.perkId)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'clearLocation':
        runtime?.clearLocation(message.key, message.lootItem, message.lootQty)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'dropItem':
        runtime?.dropItem(message.key, message.itemId, message.qty)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'pickUpLocation':
        runtime?.pickUpLocation(message.key)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'spendBassline':
        runtime?.spendBassline(message.amount)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
      case 'exportSave':
        postWorkerEvent({
          type: 'save',
          payload: runtime?.exportSave() ?? '',
        })
        break
      case 'importSave':
        runtime?.importSave(message.payload)
        postWorkerEvent({ type: 'snapshot', snapshot: snapshot() })
        break
    }
  } catch (error) {
    postWorkerEvent({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

async function ensureRuntime() {
  if (!runtimeReady) {
    runtimeReady = init().then(() => {
      runtime = new WebRuntime()
    })
  }
  await runtimeReady
}

function snapshot(): SimulationSnapshot {
  return runtime?.snapshot() as SimulationSnapshot
}

function catalog(): CatalogSnapshot {
  return runtime?.catalog() as CatalogSnapshot
}

function postWorkerEvent(message: WorkerEvent) {
  postMessage(message)
}

export {}
