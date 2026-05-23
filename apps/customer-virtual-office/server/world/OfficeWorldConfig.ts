export interface InteractiveObjectSeed {
  id: string
}

export interface OfficeWorldConfig {
  interactiveObjects: {
    computers: InteractiveObjectSeed[]
    whiteboards: InteractiveObjectSeed[]
  }
}

function createSequentialObjectSeeds(count: number): InteractiveObjectSeed[] {
  return Array.from({ length: count }, (_, index) => ({ id: String(index) }))
}

export const defaultOfficeWorldConfig: OfficeWorldConfig = {
  interactiveObjects: {
    computers: createSequentialObjectSeeds(5),
    whiteboards: createSequentialObjectSeeds(3),
  },
}

