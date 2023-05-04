import { AsstMsg, CoreLoader, type InstanceWrapper } from '@mcs/ffi'
import { defaultAdb, logger } from '@mcs/utils'

import type { UseServerModule } from '../types'
import { makeSuccess, makeError } from '../utils'

export const useFFI: UseServerModule = app => {
  const loader = new CoreLoader()

  const callbacks: Record<string, Buffer> = {}
  const callbackBind: Record<
    string,
    ((code: number, data: Record<string, string | number>) => boolean)[]
  > = {}
  const callbackCounter: Record<string, number> = {}
  const callbackCache: Record<string, [number, Record<string, unknown>][]> = {}
  const wrappers: Record<string, InstanceWrapper> = {}

  app.get('/api/version', (req, res) => {
    res.send(
      makeSuccess({
        version: loader.GetVersion() ?? 'N/A',
      })
    )
  })

  app.get('/api/listen', (req, res) => {
    const uuid = req.query.uuid as string

    if (!(uuid in wrappers)) {
      res.send(makeError('uuid not exists'))
      return
    }

    const id = callbackCounter[uuid]
    callbackCounter[uuid] = id + 1
    const multiId = `${uuid}/${id}`
    callbackCache[multiId] = []

    callbackBind[uuid].push((code, data) => {
      const keep = multiId in callbackCache
      if (!keep) {
        return false
      }
      callbackCache[multiId].push([code, data])
      return true
    })
    res.send(
      makeSuccess({
        id,
      })
    )
  })

  app.get('/api/unlisten', (req, res) => {
    const uuid = req.query.uuid as string

    if (!(uuid in wrappers)) {
      res.send(makeError('uuid not exists'))
      return
    }

    const id = req.query.id as string
    const multiId = `${uuid}/${id}`

    const rest = callbackCache[multiId] ?? []
    if (multiId in callbackCache) {
      delete callbackCache[multiId]
    }
    res.send(
      makeSuccess({
        rest,
      })
    )
  })

  app.get('/api/poll', (req, res) => {
    const uuid = req.query.uuid as string

    if (!(uuid in wrappers)) {
      res.send(makeError('uuid not exists'))
      return
    }

    const id = req.query.id as string
    const multiId = `${uuid}/${id}`

    const peek = ((req.query.peek as string | undefined) ?? '1') !== '0'
    const count = parseInt((req.query.count as string | undefined) ?? '1')

    let data: (typeof callbackCache)[string] = []
    if (peek) {
      data = callbackCache[multiId].slice(0, count)
    } else {
      data = callbackCache[multiId].splice(0, count)
    }
    res.send(
      makeSuccess({
        data,
      })
    )
  })

  app.get('/api/create', (req, res) => {
    const uuid = req.query.uuid as string
    const touchMode = (req.query.touch as string | undefined) ?? 'minitouch'

    callbacks[uuid] = CoreLoader.bindCallback((code, data) => {
      logger.ffi.info('Callback called with', code, data)
      const pdata = JSON.parse(data)
      callbackBind[uuid] =
        callbackBind[uuid]?.filter(fn => {
          return fn(code, pdata)
        }) ?? []
    })

    const wrapper = loader.CreateEx(callbacks[uuid])

    wrapper.SetInstanceOption(2, touchMode)

    wrappers[uuid] = wrapper

    callbackBind[uuid] = []
    callbackCounter[uuid] = 0

    res.send(makeSuccess({}))
  })

  app.post('/api/connect', (req, res) => {
    const body = req.body as {
      uuid: string
      address: string
      config: string
    }

    const uuid = body.uuid

    if (!(uuid in wrappers)) {
      res.send(makeError('uuid not exists'))
      return
    }

    const callId = wrappers[uuid].AsyncConnect(defaultAdb, body.address ?? '', body.config ?? '')
    callbackBind[uuid].push((code, data) => {
      if (code === AsstMsg.AsyncCallInfo && data.async_call_id === callId) {
        res.send(makeSuccess(data))
        return false
      }
      return true
    })
  })

  return {
    init: () => {
      logger.ffi.info('Express module inited')
      loader.load()
      loader.config()
    },
    deinit: () => {
      // TODO: STOP TASKS
      loader.dispose()
    },
  }
}
