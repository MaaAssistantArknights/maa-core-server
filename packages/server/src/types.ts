export interface GlobalConfig {
  service: {
    port: number
  }
  manager: {
    port: number
  }
  core: {
    path: string
  }
  adb: {
    path: string
  }
  forkOnStart: boolean
}
