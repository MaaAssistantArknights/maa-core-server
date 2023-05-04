import cluster, { Worker } from 'node:cluster'

import express, { json } from 'express'

import { logger } from '@mcs/utils'

import { Server } from './server'

if (cluster.isWorker) {
  const server = new Server()

  server.init()
  const s = server.listen()
  logger.worker.info('Server started')

  process.on('SIGTERM', () => {
    s.close(() => {
      server.deinit()
      process.exit(0)
    })
  })
} else {
  let worker: Worker | null = null

  const app = express()
  app.use(json())

  let waitingStop: (() => void) | null = null

  cluster.on('exit', worker => {
    logger.default.info(`Worker ${worker.id} exit`)
    if (waitingStop) {
      const f = waitingStop
      waitingStop = null
      f()
    }
  })

  app.get('/status', (req, res) => {
    res.send({
      status: worker ? (worker.isDead() ? 'dead' : 'alive') : 'stop',
    })
  })

  async function stop() {
    if (worker) {
      const pro = new Promise<void>(resolve => {
        waitingStop = resolve
      })
      worker.destroy('SIGTERM')
      await pro
    }
  }

  function start() {
    worker = cluster.fork()
  }

  app.get('/start', (req, res) => {
    if (worker && !worker.isDead()) {
      res.send({
        status: 'already running',
      })
    } else {
      worker = cluster.fork()
      res.send({
        status: 'ok',
      })
    }
  })

  app.get('/stop', async (req, res) => {
    if (worker && !worker.isDead()) {
      await stop()
      res.send({
        status: 'ok',
      })
    } else {
      res.send({
        status: 'not running',
      })
    }
  })

  app.get('/restart', async (req, res) => {
    if (worker && !worker.isDead()) {
      await stop()
    }
    start()
    res.send({
      status: 'ok',
    })
  })

  app.listen(8080)
}
