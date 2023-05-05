import path from 'node:path'
import fs from 'node:fs/promises'

import { execa } from 'execa'

import { gb2312Decode, logger } from '../..'
import type { Emulator } from '../types'
import { queryProcess } from './utils'

export async function getNox(emulator: Emulator): Promise<boolean> {
  emulator.config = 'Nox'
  emulator.displayName = '夜神模拟器'

  const noxs = await queryProcess(
    {
      Name: 'Nox.exe',
    },
    'ExecutablePath'
  )

  if (noxs.length === 0) {
    logger.adapter.error('Cannot find Nox.exe')
    return false
  }

  const root = path.dirname(noxs[0].ExecutablePath)

  emulator.adbPath = path.resolve(root, 'nox_adb.exe')

  const noxConsole = path.resolve(root, 'NoxConsole.exe')

  for (const line of gb2312Decode((await execa(noxConsole, ['list'], { encoding: null })).stdout)
    .split(/[\r\n]+/)
    .map(x => x.split(','))) {
    if (line.length > 1 && (line.pop() as string) === emulator.pid) {
      emulator.commandLine = [noxConsole, ['launch', `-name:${line[2]}`]]
      const vmName = line[1]
      const configPath = path.resolve(root, 'BignoxVMS', vmName, `${vmName}.vbox`)
      if (!configPath) {
        logger.adapter.error('Nox config file not exist!', configPath)
        return false
      }
      const config = await fs.readFile(configPath, 'utf-8')
      const getPortReg =
        /<Forwarding name="port2" proto="1" hostip="127.0.0.1" hostport="(\d{4,6})" guestport="5555"\/>/
      const configPort = config.match(getPortReg)
      if (configPort) {
        emulator.address = `127.0.0.1:${configPort[1]}`
        return true
      } else {
        logger.adapter.error("Nox config file doesn't contain port information!", configPath)
        return false
      }
    }
  }
  return false
}
