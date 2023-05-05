import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'

import { execa } from 'execa'

import { logger } from '../..'
import type { Emulator } from '..'
import { queryProcess } from './utils'

export async function getXY(emulator: Emulator): Promise<boolean> {
  /**
   * 逍遥模拟器获取流程：
   *  1. 根据"MEmuHeadless.exe"获取pid
   *  2. 通过GetCommandLine获取命令行, 其--comment参数为模拟器实际文件夹名, 假设为vm1
   *  3. 构造路径"F:\EMULATORS\xyaz\Microvirt\MEmu\MemuHyperv VMs\vm1"
   *  4. 在路径下面有Memu.memu文件，构造正则提取以下示例行中的hostport
   *  <Forwarding name="ADB" proto="1" hostip="127.0.0.1" hostport="21503" guestip="10.0.2.15" guestport="5555"/>
   */
  emulator.config = 'XYAZ'
  emulator.displayName = '逍遥模拟器'

  const memus = await queryProcess(
    {
      Name: 'Memu.exe',
    },
    'ExecutablePath'
  )

  if (memus.length === 0) {
    logger.adapter.error('Cannot find Memu.exe')
    return false
  }

  const root = path.dirname(memus[0].ExecutablePath)

  emulator.adbPath = path.resolve(root, 'adb.exe')

  logger.adapter.info('XY adb_path', emulator.adbPath)

  // headless.exe的启动参数, 实际上是不可用的, 提取其中的comment为模拟器真实名称, statvm为模拟器uuid
  const cmd = (
    await queryProcess(
      {
        ProcessId: emulator.pid,
      },
      'CommandLine'
    )
  )[0].CommandLine
  emulator.commandLine = cmd

  const confName = cmd.match(/--comment ([^\s]+)/)
  if (confName) {
    const confPath = path.resolve(root, 'MemuHyperv VMs', confName[1], `${confName[1]}.memu`)
    logger.adapter.info('XY conf_path', confPath)

    if (!existsSync(confPath)) {
      logger.adapter.error('Memu.memu not exist! path', confPath)
      return false
    }

    const confDetail = await fs.readFile(confPath, 'utf-8') // 读Memu.memu文件
    const portMatchResult = confDetail.match(
      /<Forwarding name="ADB" proto="1" hostip="127.0.0.1" hostport="(\d+)"/
    )
    if (portMatchResult) {
      emulator.address = `127.0.0.1:${portMatchResult[1]}`
      return true
    }
  }
  return false
}
