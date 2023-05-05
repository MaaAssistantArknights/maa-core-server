import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'

import type { Emulator } from '..'
import { logger } from '../..'
import { listRegistry, queryProcess, queryRegistry, testPort } from './utils'
import { execa } from 'execa'

function getInstanceName(cmd: string) {
  const instanceExp = /".*"\s"?--instance"?\s"?([^"\s]*)"?/g
  const res = [...cmd.matchAll(instanceExp)].map(v => v[1])
  const name = res ? res[0] : 'unknown'
  logger.adapter.info('Get bluestack instance name', name)
  return name
}

export async function getBluestack(emulator: Emulator): Promise<boolean> {
  emulator.config = 'BlueStacks'

  const bluestacks = await queryProcess(
    {
      ProcessId: emulator.pid,
    },
    ['ExecutablePath', 'CommandLine']
  )

  if (bluestacks.length === 0) {
    logger.adapter.error('Cannot find process with id', emulator.pid)
    return false
  }

  const target = bluestacks[0]

  const root = path.dirname(target.ExecutablePath)

  emulator.adbPath = path.join(root, 'HD-Adb.exe')

  const cmd = target.CommandLine

  emulator.commandLine = cmd // 从命令行启动的指令

  const instanceName = getInstanceName(cmd)

  if (root.includes('BluestacksCN')) {
    // 蓝叠CN特供版本 读注册表 Computer\HKEY_LOCAL_MACHINE\SOFTWARE\BlueStacks_china_gmgr\Guests\Android\Network\0 中的InboundRules
    // 搞两套方案，先读注册表拿adb端口, 如果读失败了可能是打包复制导致，再使用 netstat 尝试
    let success: boolean = false
    try {
      const emulatorName: string[] = (
        await listRegistry('HKEY_LOCAL_MACHINE\\SOFTWARE\\BlueStacks_china_gmgr\\Guests')
      ).map(v => v.PSChildName) // 蓝叠CN注册表中的模拟器id
      if (emulatorName.length === 0) success = false
      else {
        for await (const v of emulatorName) {
          const port = (
            await queryRegistry<string, true, 'InboundRules'>(
              `HKEY_LOCAL_MACHINE\\SOFTWARE\\BlueStacks_china_gmgr\\Guests\\${v}\\Network\\0`,
              'InboundRules'
            )
          ).InboundRules[0]
            .split(':')
            .pop()

          // 总是全量扫描
          // !inUsePorts.includes(port)
          if (port && (await testPort(parseInt(port))) && !success) {
            // 端口没有被占用, 测试端口成功, 本次循环未使用这个端口
            emulator.address = `127.0.0.1:${port}`
            emulator.displayName = 'BlueStack CN [regedit]'
            success = true
          }
          if (success) break
        }
      }
    } catch (err) {
      success = false
    }
    if (success) {
      return true
    }

    // 通过读注册表失败, 使用 netstat 抓一个5开头的端口充数
    const regExp = '\\s*TCP\\s*127.0.0.1:(5\\d{3,4})\\s*' // 提取端口
    const matchResult = (
      await execa('netstat', ['-ano']).pipeStdout?.(execa('findstr', [emulator.pid]))
    )?.stdout.match(regExp)

    emulator.address = matchResult ? `127.0.0.1:${matchResult[1]}` : '127.0.0.1:5555'
    emulator.displayName = 'BlueStack CN [no regedit]'
    return true
  }

  const regKey = root.includes('BlueStacks_nxt_cn') ? 'BlueStacks_nxt_cn' : 'BlueStacks_nxt'

  const confPath = path.join(
    path.normalize(
      (await queryRegistry(`HKEY_LOCAL_MACHINE\\SOFTWARE\\${regKey}`, 'UserDefinedDir'))
        .UserDefinedDir
    ),
    'bluestacks.conf'
  )

  if (!existsSync(confPath)) {
    logger.adapter.error(`bluestacks.conf not exist! path`, confPath)
    return false
  }
  const conf = await fs.readFile(confPath, 'utf-8')

  const confPortInstanceExp = instanceName
    ? new RegExp(`bst.instance.${instanceName}.status.adb_port="(\\d{4,6})"`)
    : /bst.instance.(?:.*).status.adb_port="(\d{4,6})"/
  const confPort = conf.match(confPortInstanceExp)
  logger.adapter.info('Bluestack confport', confPort)

  emulator.displayName = 'BlueStack Global'
  if (confPort) {
    emulator.address = `127.0.0.1:${confPort[1]}`
  } else {
    // fallback
    emulator.address = '127.0.0.1:5555'
  }
  return true
  /**
    e.tag = 'BlueStack Global';
    [...conf.matchAll(confPortExp)]
      .filter(async (v) => {
        if (inUsePorts.includes(v[1])) return true
        else return await testPort('127.0.0.1', v[1])
      })
      .map((v) => v[1])
      .some((v) => {
        if (!inUsePorts.includes(v)) {
          inUsePorts.push(v)
          e.address = `127.0.0.1:${v}`
          return true
        }
        return false
      })
  }
   */
}
