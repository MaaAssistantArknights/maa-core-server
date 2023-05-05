import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'

import { logger } from '../..'
import type { Emulator } from '..'
import { queryProcess } from './utils'

export async function getMumu(emulator: Emulator): Promise<boolean> {
  // MuMu的adb端口仅限7555, 所以, 请不要使用MuMu多开!
  // 流程: 有"NemuHeadless.exe"进程后，就去抓'NemuPlayer.exe'的路径.
  emulator.config = 'MuMuEmulator'
  emulator.displayName = 'MuMu模拟器'

  const mumus = await queryProcess(
    {
      Name: 'NemuPlayer.exe',
    },
    'ExecutablePath'
  )

  if (mumus.length === 0) {
    logger.adapter.error('Cannot find NemuPlayer.exe')
    return false
  }

  const emuPath = mumus[0].ExecutablePath // 模拟器启动器路径
  emulator.adbPath = path.resolve(emuPath, '../../vmonitor/bin/adb_server.exe') // 模拟器adb路径
  emulator.address = '127.0.0.1:7555' // 不测端口了，唯一指定7555
  // 启动命令, 提取出--startvm选项, 然后和emuPathExp拼接得到实际启动命令.
  const cmd = (
    await queryProcess(
      {
        ProcessId: emulator.pid,
      },
      'CommandLine'
    )
  )[0].CommandLine

  const startvm = cmd.match(/--startvm ([^\s]+)/) // FIXME: 写错了
  if (startvm) {
    emulator.commandLine = '"' + emuPath + '" -m ' + startvm[1] // 实际命令行启动指令
  }

  return true
}

export async function getMumu12(emulator: Emulator): Promise<boolean> {
  emulator.config = 'MuMuEmulator'
  emulator.displayName = 'MuMu模拟器12'

  const mumus = await queryProcess(
    {
      Name: 'NemuPlayer.exe',
    },
    'ExecutablePath'
  )

  if (mumus.length === 0) {
    logger.adapter.error('Cannot find NemuPlayer.exe')
    return false
  }

  const emuPath = mumus[0].ExecutablePath // 模拟器启动器路径
  emulator.adbPath = path.resolve(emuPath, '../adb.exe') // 模拟器adb路径

  const cmd = (
    await queryProcess(
      {
        ProcessId: emulator.pid,
      },
      'CommandLine'
    )
  )[0].CommandLine

  const vmName = cmd.match(/--comment ([.\w-]+) --startvm/)
  if (!vmName) {
    logger.adapter.info('Found mumu12, but vmName not found, cmd', cmd)
    return false
  }
  logger.adapter.info('Found mumu12, vmName', vmName[1]) // 寻找模拟器名, 配置在mumu根目录的vms里

  const configPath = path.resolve(emuPath, `../../vms/${vmName[1]}/configs`, 'vm_config.json')
  if (!existsSync(configPath)) {
    logger.adapter.error('MuMu config file not exist! path', configPath)
    return false
  }

  const conf = await fs.readFile(configPath, 'utf-8')
  try {
    const confPort = JSON.parse(conf).vm.nat.port_forward.adb.host_port as string
    emulator.address = `127.0.0.1:${confPort}`
  } catch (e) {
    logger.adapter.error(e)
  }

  const vmIndex = vmName[1].match(/MuMuPlayer-12.0-(\d+)/)
  if (vmIndex) {
    if (vmIndex[1] === '0') {
      emulator.commandLine = [emuPath, []] // 默认启动第一个模拟器
    } else {
      emulator.commandLine = [emuPath, ['-v', vmIndex[1]]]
    }
  }

  return true
}
