import { logger } from '@mcs/utils'
import { Server } from './server'

logger.default.info(process.cwd)

const server = new Server()

server.init()

if (import.meta.env.PROD) {
  server.listen()
}

export const expressServer = server.server
