import path from 'node:path'
import { execa } from 'execa'

import { dependencesPrefix } from '../config'
import { logger } from '../logger'

const exeSuffix = process.platform === 'win32' ? '.exe' : ''

export const defaultAdb = path.join(dependencesPrefix, 'platform-tools', `adb${exeSuffix}`)

export async function getUuid(address: string, adb = defaultAdb) {
  const { stdout: connectResult } = await execa(adb, ['connect', address])
  if (!/connected/.test(connectResult)) {
    return null
  }
  try {
    const { stdout: idResult } = await execa(adb, [
      '-s',
      address,
      'shell',
      'settings',
      'get',
      'secure',
      'android_id',
    ])
    const uuid = idResult.trim()
    if (uuid) {
      return uuid
    } else {
      return null
    }
  } catch (err: unknown) {
    logger.default.warn('Failed to get uuid for', address, (err as Error).message)
    return null
  }
}
