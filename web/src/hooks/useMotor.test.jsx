import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMotor } from './useMotor.js'
import * as motor from '../lib/motor.js'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

it('fica online quando o ping responde', async () => {
  vi.spyOn(motor, 'pingMotor').mockResolvedValue({ versao: '1', temCUDA: true, nucleos: 12, ocupado: false })
  const { result } = renderHook(() => useMotor(1000))
  await vi.runOnlyPendingTimersAsync()
  await waitFor(() => expect(result.current.online).toBe(true))
  expect(result.current.info.temCUDA).toBe(true)
})

it('fica offline quando o ping devolve null', async () => {
  vi.spyOn(motor, 'pingMotor').mockResolvedValue(null)
  const { result } = renderHook(() => useMotor(1000))
  await vi.runOnlyPendingTimersAsync()
  await waitFor(() => expect(result.current.online).toBe(false))
})
