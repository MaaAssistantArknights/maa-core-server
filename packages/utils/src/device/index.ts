export type { Emulator } from './types'
export { defaultAdb } from './utils'

export async function getEmulators() {
  const platform = process.platform
  if (platform === 'win32') {
    return (await import('./win')).getEmulators
  } else if (platform === 'darwin') {
    return (await import('./mac')).getEmulators
  } else {
    return (await import('./linux')).getEmulators
  }
}
