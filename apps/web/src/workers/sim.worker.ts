/// <reference lib="webworker" />

import init, { WebRuntime } from '../lib/wasm/add-web-bindings/runtime'
import type { SimulationSnapshot, WorkerEvent, WorkerRequest } from '../lib/sim/protocol'

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
        postMessage({ type: 'ready', snapshot: snapshot(), catalog: catalog() } satisfies WorkerEvent)
        break
      case 'reset':
        runtime = new WebRuntime()
        postMessage({ type: 'snapshot', snapshot: snapshot() } satisfies WorkerEvent)
        break
      case 'tick':
        runtime?.tick(message.seconds)
        postMessage({ type: 'snapshot', snapshot: snapshot() } satisfies WorkerEvent)
        break
      case 'chooseStoryOption':
        runtime?.chooseStoryOption(message.beatId, message.optionId)
        postMessage({ type: 'snapshot', snapshot: snapshot() } satisfies WorkerEvent)
        break
      case 'assignHero':
        runtime?.assignHero(message.assigned)
        postMessage({ type: 'snapshot', snapshot: snapshot() } satisfies WorkerEvent)
        break
      case 'setHeroRole':
        runtime?.setHeroRole(message.roleId)
        postMessage({ type: 'snapshot', snapshot: snapshot() } satisfies WorkerEvent)
        break
      case 'setRoleCrew':
        runtime?.setRoleCrew(message.roleId, message.crew)
        postMessage({ type: 'snapshot', snapshot: snapshot() } satisfies WorkerEvent)
        break
      case 'setStationEnabled':
        runtime?.setStationEnabled(message.stationId, message.enabled)
        postMessage({ type: 'snapshot', snapshot: snapshot() } satisfies WorkerEvent)
        break
      case 'offlineCatchup':
        runtime?.runOfflineCatchup(message.elapsedSeconds)
        postMessage({ type: 'snapshot', snapshot: snapshot() } satisfies WorkerEvent)
        break
      case 'startWorldAction':
        runtime?.startWorldAction(message.actionId)
        postMessage({ type: 'snapshot', snapshot: snapshot() } satisfies WorkerEvent)
        break
      case 'startConstruction':
        runtime?.startConstruction(message.optionId)
        postMessage({ type: 'snapshot', snapshot: snapshot() } satisfies WorkerEvent)
        break
      case 'startProcessing':
        runtime?.startProcessing(message.recipeId)
        postMessage({ type: 'snapshot', snapshot: snapshot() } satisfies WorkerEvent)
        break
      case 'recruitFromSurvivorCave':
        runtime?.recruitFromSurvivorCave()
        postMessage({ type: 'snapshot', snapshot: snapshot() } satisfies WorkerEvent)
        break
      case 'spendBassline':
        runtime?.spendBassline(message.amount)
        postMessage({ type: 'snapshot', snapshot: snapshot() } satisfies WorkerEvent)
        break
      case 'exportSave':
        postMessage({
          type: 'save',
          payload: runtime?.exportSave() ?? '',
        } satisfies WorkerEvent)
        break
      case 'importSave':
        runtime?.importSave(message.payload)
        postMessage({ type: 'snapshot', snapshot: snapshot() } satisfies WorkerEvent)
        break
    }
  } catch (error) {
    postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    } satisfies WorkerEvent)
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

function catalog() {
  return runtime?.catalog()
}

export {}
