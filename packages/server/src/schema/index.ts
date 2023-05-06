import Ajv, { type AnySchema } from 'ajv'
import { schema, type types } from './schema'

const schemas: AnySchema[] = Object.values(schema)

const ajv = new Ajv({
  schemas,
})

export function validate<K extends keyof types, T = types[K]>(
  key: K,
  data: any
):
  | {
      success: true
      errors: never[]
      data: T
    }
  | {
      success: false
      errors: string[]
      data: null
    } {
  const uri = `https://maa.plus/${key}.json`
  const v = ajv.getSchema(uri)
  if (!v) {
    return {
      success: false,
      errors: [`Schema ${uri} not found.`],
      data: null,
    }
  }
  const r = v(data)
  if (r) {
    return {
      success: true,
      errors: [],
      data: data as T,
    }
  } else {
    return {
      success: false,
      errors: v.errors?.map(x => x.message).filter((x): x is string => !!x) ?? [],
      data: null,
    }
  }
}
