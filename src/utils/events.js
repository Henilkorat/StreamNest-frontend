const emitter = new EventTarget()

export function on(event, handler) {
  const wrapped = (e) => handler(e.detail)
  emitter.addEventListener(event, wrapped)
  return () => emitter.removeEventListener(event, wrapped)
}

export function emit(event, detail) {
  emitter.dispatchEvent(new CustomEvent(event, { detail }))
}
