import { getEmulators } from '@mcs/utils'

import type { UseServerModule } from '../types'
import { makeSuccess } from '../utils'

export const useDevice: UseServerModule = app => {
  app.get('/api/scan', async (req, res) => {
    res.send(
      makeSuccess({
        emulators: await (await getEmulators())(),
      })
    )
  })
  return {}
}
