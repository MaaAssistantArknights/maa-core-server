import * as tsj from 'ts-json-schema-generator'
import fs from 'fs/promises'
import { join } from 'path'

const config: tsj.Config = {
  path: 'src/schema/types/index.ts',
  type: '*',
  expose: 'export',
}

const defSchema = tsj.createGenerator(config).createSchema(config.type)

defSchema.$id = 'https://maa.plus/definitions.json'

const obj: any = {}
const tobj: string[] = []

obj.definitions = defSchema

const keys = [
  'Listen',
  'Unlisten',
  'Poll',
  'Create',
  'Destroy',
  'ConfigInstance',
  'AppendTask',
  'ConfigTask',
  'Start',
  'Stop',
  'Connect',
  'Click',
  'Screencap',
  'GetImage',
  'Version',
  'Log',
]

for (const key of keys) {
  obj[key] = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: `https://maa.plus/${key}.json`,
    $ref: `https://maa.plus/definitions.json#/definitions/${key}`,
  }
  tobj.push(`  ${key}: ${key}`)
}

fs.writeFile(
  'src/schema/schema.ts',
  [
    '',
    `import type { ${keys.join(', ')} } from './types'`,
    'export const schema = ' + JSON.stringify(obj, null, 2),

    `export type types = {`,
    tobj.join('\n'),
    '}',
  ].join('\n')
)
