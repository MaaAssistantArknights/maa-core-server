import type { Application } from 'express'

export interface ServerModule {
  init?: () => void
  deinit?: () => void
}

export type UseServerModule = (app: Application) => ServerModule
