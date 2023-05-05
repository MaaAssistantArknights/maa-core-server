import { getUuid } from '../utils'
import type { Emulator } from '../types'
import { queryProcess } from './utils'
import { getNox } from './nox'
import { getBluestack } from './bluestack'
import { getMumu, getMumu12 } from './mumu'
import { getLd, getLd9 } from './ld'
import { getXY } from './xy'

// const inUsePorts: string[] = [] // 本次识别已被使用的端口，将会在此暂存。

const emulatorList = [
  'HD-Player.exe', // 蓝叠模拟器
  'NoxVMHandle.exe', // 夜神模拟器
  'NemuHeadless.exe', // mumu模拟器
  'MuMuVMMHeadless.exe', // mumu12
  'LdVBoxHeadless.exe', // 雷电模拟器
  'Ld9BoxHeadless.exe', // 雷电9
  'MEmuHeadless.exe', // 逍遥模拟器
] as const

type EmulatorDetectTarget = (typeof emulatorList)[number]

export async function getEmulators() {
  async function processEmulator(e: Emulator) {
    const detector: Record<EmulatorDetectTarget, (e: Emulator) => Promise<boolean>> = {
      'HD-Player.exe': getBluestack,
      'NoxVMHandle.exe': getNox,
      'NemuHeadless.exe': getMumu,
      'MuMuVMMHeadless.exe': getMumu12,
      'LdVBoxHeadless.exe': getLd,
      'Ld9BoxHeadless.exe': getLd9,
      'MEmuHeadless.exe': getXY,
    }

    if (e.pname in detector) {
      if (!(await detector[e.pname as EmulatorDetectTarget](e))) {
        return null
      }
    } else {
      return null
    }

    const uuid = await getUuid(e.address ?? '')
    if (!uuid) {
      return null
    }
    e.uuid = uuid
    return e
  }

  const info = await queryProcess(null, ['ProcessId', 'Name'])
  return (
    await Promise.all(
      info
        .map(({ ProcessId, Name }) => ({
          Name,
          ProcessId: ProcessId.toString(),
        }))
        .filter(({ Name }) => emulatorList.includes(Name as EmulatorDetectTarget))
        .map(({ Name, ProcessId }) => ({
          pname: Name,
          pid: ProcessId,
        }))
        .map(processEmulator)
    )
  )
    .filter((x): x is Emulator => x !== null)
    .filter(e => e.address && e.uuid && e.adbPath && e.config && e.commandLine && e.displayName)
}
