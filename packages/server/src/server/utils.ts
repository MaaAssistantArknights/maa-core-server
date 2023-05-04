export function makeSuccess<T extends Record<string | number, unknown>>(result: T) {
  return {
    success: true,
    result,
  }
}

export function makeError(error: string) {
  return {
    success: false,
    error,
  }
}
