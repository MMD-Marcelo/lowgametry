import { useEffect, useState } from 'react'
import { pingMotor } from '../lib/motor.js'

export function useMotor(intervaloMs = 3000) {
  const [info, setInfo] = useState(null)
  const [online, setOnline] = useState(false)

  useEffect(() => {
    let vivo = true
    const bater = async () => {
      const r = await pingMotor()
      if (!vivo) return
      setInfo(r)
      setOnline(r !== null)
    }
    bater()
    const t = setInterval(bater, intervaloMs)
    return () => { vivo = false; clearInterval(t) }
  }, [intervaloMs])

  return { online, info }
}
