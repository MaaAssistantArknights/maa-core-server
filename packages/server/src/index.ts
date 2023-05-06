import path from 'node:path'
import fs from 'node:fs'
import cluster, { Worker } from 'node:cluster'

import express, { json } from 'express'

import { logger } from '@mcs/utils'

import { Server } from './server'
import type { GlobalConfig } from './types'

export const cfg: GlobalConfig = fs.existsSync('config.json')
  ? (JSON.parse(fs.readFileSync('config.json', 'utf-8')) as GlobalConfig)
  : {
      service: {
        port: 13319,
      },
      manager: {
        port: 13320,
      },
      core: {
        path: path.join('depends', 'core'),
      },
      adb: {
        path: path.join('depends', 'platform-tools'),
      },
      forkOnStart: false,
    }

if (cluster.isWorker) {
  const server = new Server()

  server.init()
  const s = server.listen(cfg.service.port)

  process.on('SIGTERM', () => {
    s.close(() => {
      server.deinit()
      process.exit(0)
    })
  })
} else {
  let worker: Worker | null = null

  if (cfg.forkOnStart) {
    worker = cluster.fork()
  }

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
    if (worker && !worker.isDead()) {
      const pro = new Promise<void>(resolve => {
        waitingStop = resolve
      })
      worker.destroy('SIGTERM')
      await pro
      return true
    } else {
      return false
    }
  }

  function start() {
    if (worker && !worker.isDead()) {
      return false
    }
    worker = cluster.fork()
    return true
  }

  app.get('/start', (req, res) => {
    if (start()) {
      res.send({
        status: 'ok',
      })
    } else {
      res.send({
        status: 'already running',
      })
    }
  })

  app.get('/stop', async (req, res) => {
    if (await stop()) {
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
    await stop()
    start()
    res.send({
      status: 'ok',
    })
  })

  function exit() {
    console.log('Close server')
    server.close(() => {
      console.log('Exit')
      process.exit(0)
    })
  }

  app.get('/exit', async (req, res) => {
    await stop()
    res.send({
      status: 'ok',
    })
    exit()
  })

  const server = app.listen(cfg.manager.port, () => {
    logger.default.info('Manage server listen on', cfg.manager.port)
  })

  process.stdin.setRawMode(true)
  process.stdin.on('data', async d => {
    if (d.at(0) === 0x1b) {
      await stop()
      exit()
    }
  })
}
