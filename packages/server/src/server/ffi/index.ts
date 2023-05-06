import { AsstMsg, CoreLoader, type InstanceWrapper } from '@mcs/ffi'
import { getDefaultAdb, logger } from '@mcs/utils'
import { validate } from '@mcs/server/schema'

import type { UseServerModule } from '../types'
import { makeSuccess, makeError } from '../utils'
import { cfg } from '../..'
import type { Response } from 'express'

type CallbackType = (code: number, data: Record<string, unknown>) => boolean

function makeAsyncCallTracker(id: number, res: Response): CallbackType {
  return (code, data) => {
    if (code === AsstMsg.AsyncCallInfo && data.async_call_id === id) {
      res.send(makeSuccess(data))
      return false
    }
    return true
  }
}

export const useFFI: UseServerModule = app => {
  const loader = new CoreLoader()

  const instData: Record<
    string,
    {
      callback: Buffer
      counter: number
      bind: CallbackType[]
      cache: Record<number, Parameters<CallbackType>[]>
      wrapper: InstanceWrapper
    }
  > = {}

  app.post('/api/listen', (req, res) => {
    const { success, errors, data } = validate('Listen', req.body)
    if (!success) {
      res.send(makeError(errors.join('\n')))
      return
    }
    const uuid = data.uuid

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
    const { success, errors, data } = validate('Unlisten', req.body)
    if (!success) {
      res.send(makeError(errors.join('\n')))
      return
    }
    const uuid = data.uuid

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    const id = data.id

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
    const { success, errors, data } = validate('Poll', req.body)
    if (!success) {
      res.send(makeError(errors.join('\n')))
      return
    }
    const uuid = data.uuid

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    const id = data.id
    const peek = data.peek ?? true
    const count = data.count ?? 1

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
    const { success, errors, data } = validate('Create', req.body)
    if (!success) {
      res.send(makeError(errors.join('\n')))
      return
    }
    const uuid = data.uuid
    const touchMode = data.touchMode ?? 'minitouch'

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
    const { success, errors, data } = validate('Destroy', req.body)
    if (!success) {
      res.send(makeError(errors.join('\n')))
      return
    }
    const uuid = data.uuid

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    instData[uuid].wrapper.Destroy()
    delete instData[uuid]

    res.send(makeSuccess({}))
  })

  app.post('/api/configInstance', (req, res) => {
    const { success, errors, data } = validate('ConfigInstance', req.body)
    if (!success) {
      res.send(makeError(errors.join('\n')))
      return
    }
    const uuid = data.uuid

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    res.send(
      makeSuccess({
        status: instData[uuid].wrapper.SetInstanceOption(data.key, data.value),
      })
    )
  })

  app.post('/api/appendTask', (req, res) => {
    const { success, errors, data } = validate('AppendTask', req.body)
    if (!success) {
      res.send(makeError(errors.join('\n')))
      return
    }
    const uuid = data.uuid

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    res.send(
      makeSuccess({
        taskId: instData[uuid].wrapper.AppendTask(data.type, JSON.stringify(data.param)),
      })
    )
  })

  app.post('/api/configTask', (req, res) => {
    const { success, errors, data } = validate('ConfigTask', req.body)
    if (!success) {
      res.send(makeError(errors.join('\n')))
      return
    }
    const uuid = data.uuid

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    res.send(
      makeSuccess({
        status: instData[uuid].wrapper.SetTaskParam(data.id, JSON.stringify(data.param)),
      })
    )
  })

  app.post('/api/start', (req, res) => {
    const { success, errors, data } = validate('Start', req.body)
    if (!success) {
      res.send(makeError(errors.join('\n')))
      return
    }
    const uuid = data.uuid

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
    const { success, errors, data } = validate('Stop', req.body)
    if (!success) {
      res.send(makeError(errors.join('\n')))
      return
    }
    const uuid = data.uuid

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
    const { success, errors, data } = validate('Connect', req.body)
    if (!success) {
      res.send(makeError(errors.join('\n')))
      return
    }
    const uuid = data.uuid

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    const d = instData[uuid]

    const callId = d.wrapper.AsyncConnect(getDefaultAdb(), data.address ?? '', data.config ?? '')
    d.bind.push(makeAsyncCallTracker(callId, res))
  })

  app.post('/api/click', (req, res) => {
    const { success, errors, data } = validate('Click', req.body)
    if (!success) {
      res.send(makeError(errors.join('\n')))
      return
    }
    const uuid = data.uuid

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    const d = instData[uuid]

    const callId = d.wrapper.AsyncClick(data.x, data.y)
    d.bind.push(makeAsyncCallTracker(callId, res))
  })

  app.post('/api/screencap', (req, res) => {
    const { success, errors, data } = validate('Screencap', req.body)
    if (!success) {
      res.send(makeError(errors.join('\n')))
      return
    }
    const uuid = data.uuid

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    const d = instData[uuid]

    const callId = d.wrapper.AsyncScreencap()
    d.bind.push(makeAsyncCallTracker(callId, res))
  })

  app.post('/api/image', (req, res) => {
    const { success, errors, data } = validate('GetImage', req.body)
    if (!success) {
      res.send(makeError(errors.join('\n')))
      return
    }
    const uuid = data.uuid

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

  app.get('/api/image', (req, res) => {
    const { success, errors, data } = validate('GetImage', req.query)
    if (!success) {
      res.send(makeError(errors.join('\n')))
      return
    }
    const uuid = data.uuid

    if (!(uuid in instData)) {
      res.send(makeError('uuid not exists'))
      return
    }

    res.send(`<img src="data:image/png;base64,${instData[uuid].wrapper.GetImage()}" />`)
  })

  app.get('/api/version', (req, res) => {
    const { success, errors, data } = validate('Version', req.body)
    if (!success) {
      res.send(makeError(errors.join('\n')))
      return
    }

    res.send(
      makeSuccess({
        version: loader.GetVersion() ?? 'N/A',
      })
    )
  })

  app.post('/api/log', (req, res) => {
    const { success, errors, data } = validate('Log', req.body)
    if (!success) {
      res.send(makeError(errors.join('\n')))
      return
    }

    loader.Log(data.level, data.message)

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
