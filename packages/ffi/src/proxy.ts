import { logger } from '@mcs/utils'

import { CoreLoader, type AsstInstance, type InstanceWrapper } from '.'

export function createWrapper(loader: CoreLoader, instance: AsstInstance): InstanceWrapper {
  return new Proxy(
    { instance },
    {
      get(target, key) {
        if (key in target) {
          return target[key as keyof typeof target]
        }
        return (...args: any[]) => {
          logger.ffi.info('Called via proxy:', key, ...args)
          return (loader as any)[key].call(loader, target.instance, ...args)
        }
      },
    }
  ) as InstanceWrapper
}
