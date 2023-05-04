import express from 'express'
import cors from 'cors'

import { logger } from '@mcs/utils'

import { useFFI } from './ffi'
import { useDevice } from './device'
import type { ServerModule } from './types'

export class Server {
  server: express.Application
  modules: ServerModule[]

  constructor() {
    this.server = express()
    this.modules = []

    this.server.use(express.json())
    this.server.use(cors())

    this.server.use((req, res, next) => {
      switch (req.method) {
        case 'GET':
          logger.express.info('GET', req.path, req.query)
          break
        case 'POST':
          logger.express.info('POST', req.path, req.body)
          break
        default:
          logger.express.warn('Unknown request method', req.method, req.path, req.query, req.body)
      }
      next()
    })

    this.modules.push(useFFI(this.server))
    this.modules.push(useDevice(this.server))
  }

  listen(port = 5555) {
    this.modules.forEach(m => {
      m.init?.()
    })

    const svr = this.server.listen(port, () => {
      logger.express.info(`Server listen on ${port} started`)
    })

    return () => {
      this.modules.forEach(m => {
        m.deinit?.()
      })
      return new Promise<void>(resolve => {
        svr.close(() => {
          resolve()
        })
      })
    }
  }
}
