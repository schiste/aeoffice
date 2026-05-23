export type Brand<TValue, TBrand extends string> = TValue & {
  readonly __brand: TBrand
}

export type TenantId = Brand<string, "TenantId">
export type UserId = Brand<string, "UserId">
export type SpaceId = Brand<string, "SpaceId">
export type RoomId = Brand<string, "RoomId">
export type MapId = Brand<string, "MapId">
export type ZoneId = Brand<string, "ZoneId">
export type PlayerId = Brand<string, "PlayerId">

export interface Timestamped {
  readonly createdAt: string
  readonly updatedAt: string
}
