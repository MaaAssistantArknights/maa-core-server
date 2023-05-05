import { connect } from 'node:net'

import { execa } from 'execa'

type MaybeArray<T> = T | T[]
type SwitchArray<T, A extends boolean> = A extends true ? T[] : A extends false ? T : never
type AcceptKey = 'ExecutablePath' | 'ProcessId' | 'CommandLine' | 'Name'
type QueryOption<K extends AcceptKey = AcceptKey> = K extends unknown
  ? {
      [k in K]: string
    }
  : never

export async function queryProcess<P extends AcceptKey>(
  option: QueryOption | null,
  property: P | P[]
) {
  // await $`Get-WmiObject -Query "select ExecutablePath FROM Win32_Process where Name='${pname}'" | Select-Object -Property ExecutablePath | ConvertTo-Json`
  function buildWhere([key, value]: [string, string]) {
    return `where ${key}='${value}'`
  }

  const keys = property instanceof Array ? property.join(',') : property
  const where = option ? buildWhere(Object.entries(option)[0]) : ''
  const { stdout } = await execa('powershell', [
    `Get-WmiObject -Query "select ${keys} FROM Win32_Process ${where}" | Select-Object -Property ${keys} | ConvertTo-Json`,
  ])
  const result: MaybeArray<{
    [k in P]: k extends 'ProcessId' ? number : string
  }> = JSON.parse(stdout)
  return result instanceof Array ? result : [result]
}

// 为啥可以使数组啊喂
export async function queryRegistry<
  T = string,
  A extends boolean = false,
  P extends string = string
>(path: string, property: P) {
  const { stdout } = await execa('powershell', [
    `Get-ItemProperty -Path Registry::${path} | Select-Object -Property ${property} | ConvertTo-Json`,
  ])
  const result: {
    [k in P]: SwitchArray<T, A>
  } = JSON.parse(stdout)
  return result
}

export async function listRegistry(path: string) {
  const { stdout } = await execa('powershell', [
    `Get-ChildItem -Path Registry::${path} | ConvertTo-Json`,
  ])
  const result: {
    PSChildName: string
  }[] = JSON.parse(stdout)
  return result
}

export async function testPort(port: number, timeout = 100) {
  return new Promise<boolean>(resolve => {
    const socket = connect(
      {
        timeout,
        port,
      },
      () => {
        resolve(true)
        socket.end()
      }
    ).on('error', () => {
      resolve(false)
      socket.end()
    })
  })
}
