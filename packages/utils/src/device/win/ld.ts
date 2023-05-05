import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'

import { execa } from 'execa'

import { logger } from '../..'
import type { Emulator } from '..'
import { queryProcess } from './utils'

export async function getLd(emulator: Emulator): Promise<boolean> {
  // 雷电模拟器识别
  emulator.config = 'LDPlayer'
  emulator.displayName = '雷电模拟器'

  const lds = await queryProcess(
    {
      Name: 'dnplayer.exe',
    },
    'ExecutablePath'
  )

  if (lds.length === 0) {
    logger.adapter.error('Cannot find dnplayer.exe')
    return false
  }

  const emuPath = lds[0].ExecutablePath // dnplayer.exe路径, 和模拟器配置信息等在一起
  const root = path.dirname(emuPath)
  const consolePath = path.resolve(root, 'dnconsole.exe') // dnconsole.exe路径, 用于启动模拟器
  emulator.adbPath = path.resolve(root, 'adb.exe') // adb路径

  // headless.exe的启动参数, 实际上是不可用的, 提取其中的comment为模拟器真实名称, statvm为模拟器uuid
  const cmd = (
    await queryProcess(
      {
        ProcessId: emulator.pid,
      },
      'CommandLine'
    )
  )[0].CommandLine

  const statvm = cmd.match(/--startvm (\w*-\w*-\w*-\w*-\w*)/) // 获取模拟器uuid, statvm
  const realName = cmd.match(/--comment ([\d+\w]*) /) // 获取真实名称, realName
  if (!realName || !statvm) {
    return false
  }

  const confPath = path.resolve(root, 'vms', 'config', `${realName[1]}.config`) // 模拟器配置文件路径
  if (!existsSync(confPath)) {
    logger.adapter.error(`${realName[1]}.config not exist! path:`, confPath)
    return false
  }

  const conf = await fs.readFile(confPath, 'utf-8') // 读config

  const displayName = conf.match(/"statusSettings.playerName":\s*"([^"]+)"/) // 读配置文件, 获取模拟器显示名称 displayName
  if (displayName) {
    // 当新建模拟器时, 不一定会有此选项, 如果没有, 则取realName最后一个数字, 手动拼接
    emulator.commandLine = [consolePath, ['launch', '--name', displayName[1]]] // 真实命令行启动指令
  } else {
    emulator.commandLine = [
      consolePath,
      ['launch', '--name', `雷电模拟器-${realName[1].slice(-1)}`],
    ] // 真实命令行启动指令
  }

  const LdVBoxHeadlessPath = (
    await queryProcess(
      {
        Name: 'LdVBoxHeadless.exe',
      },
      'ExecutablePath'
    )
  )[0].ExecutablePath

  const VBoxManagePath = path.resolve(path.dirname(LdVBoxHeadlessPath), 'VBoxManage.exe') // VBoxManage.exe路径
  const portMatchResult = (
    await execa(VBoxManagePath, ['showvminfo', statvm[1], '--machinereadable'])
  ).stdout.match(/Forwarding\(1\)="tcp_5\d\d\d_5\d\d\d,tcp,,(\d*),,/)

  if (portMatchResult) {
    emulator.address = `127.0.0.1:${portMatchResult[1]}`
    return true
  } else {
    return false
  }
}

export async function getLd9(emulator: Emulator): Promise<boolean> {
  // 雷电9模拟器识别
  emulator.config = 'LDPlayer'
  emulator.displayName = '雷电模拟器9'

  const lds = await queryProcess(
    {
      Name: 'dnplayer.exe',
    },
    'ExecutablePath'
  )

  if (lds.length === 0) {
    logger.adapter.error('Cannot find dnplayer.exe')
    return false
  }

  const emuPath = lds[0].ExecutablePath // dnplayer.exe路径, 和模拟器配置信息等在一起
  const root = path.dirname(emuPath)
  const consolePath = path.resolve(root, 'ldconsole.exe') // ldconsole.exe路径, 用于启动模拟器
  emulator.adbPath = path.resolve(root, 'adb.exe') // adb路径

  // headless.exe的启动参数, 实际上是不可用的, 提取其中的comment为模拟器真实名称, statvm为模拟器uuid
  const cmd = (
    await queryProcess(
      {
        ProcessId: emulator.pid,
      },
      'CommandLine'
    )
  )[0].CommandLine

  const statvm = cmd.match(/--startvm (\w*-\w*-\w*-\w*-\w*)/) // 获取模拟器uuid, statvm
  const realName = cmd.match(/--comment ([\d+\w]*) /) // 获取真实名称, realName
  if (!realName || !statvm) {
    return false
  }

  const confPath = path.resolve(root, 'vms', 'config', `${realName[1]}.config`) // 模拟器配置文件路径
  if (!existsSync(confPath)) {
    logger.adapter.error(`${realName[1]}.config not exist! path:`, confPath)
    return false
  }

  const conf = await fs.readFile(confPath, 'utf-8') // 读config

  const displayName = conf.match(/"statusSettings.playerName":\s*"([^"]+)"/) // 读配置文件, 获取模拟器显示名称 displayName
  if (displayName) {
    // 当新建模拟器时, 不一定会有此选项, 如果没有, 则取realName最后一个数字, 手动拼接
    emulator.commandLine = [consolePath, ['launch', '--name', displayName[1]]] // 真实命令行启动指令
  } else {
    const launchIndexReg = RegExp(`(\\d+),.*,\\d+,\\d+,\\d+,\\d+,${emulator.pid},.*`)
    const emulatorIndex = (await execa(consolePath, ['list2'])).stdout.match(launchIndexReg) // 匹配当前正在运行的模拟器列表, 寻找索引
    if (emulatorIndex) {
      logger.adapter.info('Get LD9 Emulator Index: ', emulatorIndex[1])
      emulator.commandLine = [consolePath, ['launch', '--index', emulatorIndex[1]]] // 真实命令行启动指令
    } else {
      return false
    }
  }

  const Ld9VBoxHeadlessPath = (
    await queryProcess(
      {
        Name: 'Ld9BoxHeadless.exe',
      },
      'ExecutablePath'
    )
  )[0].ExecutablePath

  const VBoxManagePath = path.resolve(path.dirname(Ld9VBoxHeadlessPath), 'VBoxManage.exe') // VBoxManage.exe路径
  const portMatchResult = (
    await execa(VBoxManagePath, ['showvminfo', statvm[1], '--machinereadable'])
  ).stdout.match(/Forwarding\(1\)="tcp_5\d\d\d_5\d\d\d,tcp,,(\d*),,/)

  if (portMatchResult) {
    emulator.address = `127.0.0.1:${portMatchResult[1]}`
    return true
  } else {
    return false
  }
}
