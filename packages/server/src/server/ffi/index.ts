import { AsstMsg, CoreLoader, type InstanceWrapper } from '@mcs/ffi'
import { getDefaultAdb, logger } from '@mcs/utils'

import type { UseServerModule } from '../types'
import { makeSuccess, makeError } from '../utils'
import { cfg } from '../..'

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

    res.send(makeSuccess({}))
  })

  app.post('/api/configInstance', (req, res) => {
    const uuid = req.body.uuid as string

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    res.send(
      makeSuccess({
        status: instData[uuid].wrapper.SetInstanceOption(
          req.body.key as number,
          req.body.value as string
        ),
      })
    )
  })

  app.post('/api/appendTask', (req, res) => {
    const uuid = req.body.uuid as string

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    res.send(
      makeSuccess({
        taskId: instData[uuid].wrapper.AppendTask(
          req.body.type as string,
          JSON.stringify(req.body.param)
        ),
      })
    )
  })

  app.post('/api/configTask', (req, res) => {
    const uuid = req.body.uuid as string

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    res.send(
      makeSuccess({
        status: instData[uuid].wrapper.SetTaskParam(
          req.body.id as number,
          JSON.stringify(req.body.param)
        ),
      })
    )
  })

  app.post('/api/start', (req, res) => {
    const uuid = req.body.uuid as string

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    res.send(
      makeSuccess({
        status: instData[uuid].wrapper.Start(),
      })
    )
  })

  app.post('/api/stop', (req, res) => {
    const uuid = req.body.uuid as string

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    res.send(
      makeSuccess({
        status: instData[uuid].wrapper.Stop(),
      })
    )
  })

  app.post('/api/connect', (req, res) => {
    const uuid = req.body.uuid as string

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    const d = instData[uuid]

    const callId = d.wrapper.AsyncConnect(
      getDefaultAdb(),
      req.body.address ?? '',
      req.body.config ?? ''
    )
    d.bind.push((code, data) => {
      if (code === AsstMsg.AsyncCallInfo && data.async_call_id === callId) {
        res.send(makeSuccess(data))
        return false
      }
      return true
    })
  })

  app.post('/api/click', (req, res) => {
    const uuid = req.body.uuid as string

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    const d = instData[uuid]

    const callId = d.wrapper.AsyncClick(req.body.x as number, req.body.y as number)
    d.bind.push((code, data) => {
      if (code === AsstMsg.AsyncCallInfo && data.async_call_id === callId) {
        res.send(makeSuccess({}))
        return false
      }
      return true
    })
  })

  app.post('/api/screencap', (req, res) => {
    const uuid = req.body.uuid as string

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    const d = instData[uuid]

    const callId = d.wrapper.AsyncScreencap()
    d.bind.push((code, data) => {
      if (code === AsstMsg.AsyncCallInfo && data.async_call_id === callId) {
        res.send(makeSuccess({}))
        return false
      }
      return true
    })
  })

  app.post('/api/image', (req, res) => {
    const uuid = req.body.uuid as string

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    res.send(
      makeSuccess({
        data: instData[uuid].wrapper.GetImage(),
      })
    )
  })

  app.get('/api/version', (req, res) => {
    res.send(
      makeSuccess({
        version: loader.GetVersion() ?? 'N/A',
      })
    )
  })

  app.post('/api/log', (req, res) => {
    loader.Log(req.body.level as string, req.body.message as string)

    res.send(makeSuccess({}))
  })

  return {
    init: () => {
      logger.ffi.info('Express module inited')
      loader.load(cfg.core.path)
      loader.SetUserDir('.')
      loader.LoadResource(cfg.core.path)
    },
    deinit: () => {
      for (const uuid of Object.keys(instData)) {
        instData[uuid].wrapper.Stop()
        instData[uuid].wrapper.Destroy()
        delete instData[uuid]
      }
      // TODO: STOP TASKS
      loader.dispose()
    },
  }
}
