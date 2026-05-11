type ToastType = 'success' | 'error'
type ToastListener = (message: string, type: ToastType) => void

let _listener: ToastListener | null = null

export function _setToastListener(fn: ToastListener) {
  _listener = fn
}

export const toast = {
  success: (message: string) => _listener?.(message, 'success'),
  error: (message: string) => _listener?.(message, 'error'),
}
