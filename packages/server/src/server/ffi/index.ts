import { AsstMsg, CoreLoader, type InstanceWrapper } from '@mcs/ffi'
import { defaultAdb, logger } from '@mcs/utils'

import type { UseServerModule } from '../types'
import { makeSuccess, makeError } from '../utils'

export const useFFI: UseServerModule = app => {
  const loader = new CoreLoader()

  const instData: Record<
    string,
    {
      callback: Buffer
      counter: number
      bind: ((code: number, data: Record<string, unknown>) => boolean)[]
      cache: Record<number, [number, Record<string, unknown>][]>
      wrapper: InstanceWrapper
    }
  > = {}

  app.get('/api/version', (req, res) => {
    res.send(
      makeSuccess({
        version: loader.GetVersion() ?? 'N/A',
      })
    )
  })

  app.post('/api/listen', (req, res) => {
    const uuid = req.body.uuid as string

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    const d = instData[uuid]

    const id = d.counter
    d.counter = id + 1
    d.cache[id] = []

    d.bind.push((code, data) => {
      const keep = id in d.cache
      if (!keep) {
        return false
      }
      d.cache[id].push([code, data])
      return true
    })
    res.send(
      makeSuccess({
        id,
      })
    )
  })

  app.post('/api/unlisten', (req, res) => {
    const uuid = req.body.uuid as string

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    const id = req.body.id as number

    const d = instData[uuid]

    const rest = d.cache[id]
    delete d.cache[id]
    res.send(
      makeSuccess({
        rest,
      })
    )
  })

  app.post('/api/poll', (req, res) => {
    const uuid = req.body.uuid as string

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    const id = req.body.id as number
    const peek = ((req.body.peek as string | undefined) ?? '1') !== '0'
    const count = parseInt((req.body.count as string | undefined) ?? '1')

    const d = instData[uuid]

    let result: (typeof d.cache)[number] = []
    if (peek) {
      result = d.cache[id].slice(0, count)
    } else {
      result = d.cache[id].splice(0, count)
    }
    res.send(
      makeSuccess({
        result,
      })
    )
  })

  app.post('/api/create', (req, res) => {
    const uuid = req.body.uuid as string
    const touchMode = (req.body.touch as string | undefined) ?? 'minitouch'

    const callback = CoreLoader.bindCallback((code, data) => {
      logger.ffi.info('Callback called with', code, data)
      const pdata = JSON.parse(data)
      instData[uuid].bind =
        instData[uuid].bind?.filter(fn => {
          return fn(code, pdata)
        }) ?? []
    })

    const wrapper = loader.CreateEx(callback)

    wrapper.SetInstanceOption(2, touchMode)

    instData[uuid] = {
      callback,
      counter: 0,
      bind: [],
      cache: {},
      wrapper,
    }

    res.send(makeSuccess({}))
  })

  app.post('/api/destroy', (req, res) => {
    const uuid = req.body.uuid as string

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    instData[uuid].wrapper.Destroy()
    delete instData[uuid]
  })

  app.post('/api/connect', (req, res) => {
    const uuid = req.body.uuid as string

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    const d = instData[uuid]

    const callId = d.wrapper.AsyncConnect(defaultAdb, req.body.address ?? '', req.body.config ?? '')
    d.bind.push((code, data) => {
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
