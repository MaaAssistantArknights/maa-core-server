import log4js from 'log4js'

log4js.configure({
  appenders: {
    cheese: {
      type: 'file',
      filename: 'maa-core-server.log',
    },
  },
  categories: {
    default: {
      appenders: ['cheese'],
      level: 'all',
    },
  },
})

export const logger = {
  default: log4js.getLogger(),
  adapter: log4js.getLogger('adapter'),
  express: log4js.getLogger('express'),
  ffi: log4js.getLogger('ffi'),
  worker: log4js.getLogger('worker'),
}
