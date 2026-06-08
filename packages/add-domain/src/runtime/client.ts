import type { CatalogSnapshot, SimulationSnapshot, WorkerEvent, WorkerRequest } from './protocol'

export interface SimulationClientOptions {
  onSnapshot(snapshot: SimulationSnapshot): void
  onReady(snapshot: SimulationSnapshot, catalog: CatalogSnapshot): void
  onSave(payload: string): void
  onError(message: string): void
  worker?: Worker
  createWorker?: () => Worker
}

export class SimulationClient {
  private readonly options: SimulationClientOptions
  private readonly worker: Worker

  constructor(options: SimulationClientOptions) {
    this.options = options
    this.worker = createSimulationWorker(options)
    this.worker.addEventListener('message', this.onMessage as EventListener)
  }

  init() {
    this.post({ type: 'init' })
  }

  tick(seconds: number) {
    this.post({ type: 'tick', seconds })
  }

  chooseStoryOption(beatId: string, optionId: string) {
    this.post({ type: 'chooseStoryOption', beatId, optionId })
  }

  reset() {
    this.post({ type: 'reset' })
  }

  runOfflineCatchup(elapsedSeconds: number) {
    this.post({ type: 'offlineCatchup', elapsedSeconds })
  }

  assignHero(assigned: boolean) {
    this.post({ type: 'assignHero', assigned })
  }

  setHeroRole(roleId: string) {
    this.post({ type: 'setHeroRole', roleId })
  }

  setRoleCrew(roleId: string, crew: number) {
    this.post({ type: 'setRoleCrew', roleId, crew })
  }

  setStationEnabled(stationId: string, enabled: boolean) {
    this.post({ type: 'setStationEnabled', stationId, enabled })
  }

  startWorldAction(actionId: string) {
    this.post({ type: 'startWorldAction', actionId })
  }

  startConstruction(optionId: string) {
    this.post({ type: 'startConstruction', optionId })
  }

  startProcessing(recipeId: string) {
    this.post({ type: 'startProcessing', recipeId })
  }

  recruitFromSurvivorCave() {
    this.post({ type: 'recruitFromSurvivorCave' })
  }

  moveHeroTo(q: number, r: number) {
    this.post({ type: 'moveHeroTo', q, r })
  }

  openDoor(key: string) {
    this.post({ type: 'openDoor', key })
  }

  spendBassline(amount: number) {
    this.post({ type: 'spendBassline', amount })
  }

  exportSave() {
    this.post({ type: 'exportSave' })
  }

  importSave(payload: string) {
    this.post({ type: 'importSave', payload })
  }

  dispose() {
    this.worker.removeEventListener('message', this.onMessage as EventListener)
    this.worker.terminate()
  }

  private onMessage = (event: MessageEvent<WorkerEvent>) => {
    const message = event.data

    switch (message.type) {
      case 'ready':
        this.options.onReady(message.snapshot, message.catalog)
        return
      case 'snapshot':
        this.options.onSnapshot(message.snapshot)
        return
      case 'save':
        this.options.onSave(message.payload)
        return
      case 'error':
        this.options.onError(message.message)
        return
    }
  }

  private post(message: WorkerRequest) {
    this.worker.postMessage(message)
  }
}

function createSimulationWorker(options: SimulationClientOptions): Worker {
  if (options.worker) return options.worker
  if (options.createWorker) return options.createWorker()

  throw new Error(
    'SimulationClient requires a Worker instance or createWorker callback from the app layer.',
  )
}
