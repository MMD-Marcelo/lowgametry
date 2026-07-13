import '@testing-library/jest-dom'
import { vi } from 'vitest'

// @testing-library/dom's waitFor só detecta fake timers via um global `jest`
// (checa `setTimeout.clock`). Vitest não expõe esse global, então criamos um
// shim mínimo para que waitFor funcione com vi.useFakeTimers().
if (typeof globalThis.jest === 'undefined') {
  globalThis.jest = {
    advanceTimersByTime: (...args) => vi.advanceTimersByTime(...args),
  }
}
