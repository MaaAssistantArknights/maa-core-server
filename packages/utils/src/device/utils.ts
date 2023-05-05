import path from 'node:path'
import { execa } from 'execa'

import { cfg } from '@mcs/server'

import { logger } from '../logger'

const exeSuffix = process.platform === 'win32' ? '.exe' : ''

export function getDefaultAdb() {
  return path.resolve(cfg.adb.path, `adb${exeSuffix}`)
}

export async function getUuid(address: string) {
  const adb = getDefaultAdb()

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
