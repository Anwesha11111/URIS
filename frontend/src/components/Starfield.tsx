import { useEffect, useRef } from 'react'

export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    let id: number
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.1 + 0.15,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.012 + 0.003,
    }))
    let t = 0
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height)
      t += 0.01
      stars.forEach(s => {
        const a = 0.1 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed * 60 + s.phase))
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(184,212,240,${a})`; ctx.fill()
      })
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', width: '100vw', height: '100vh' }} />
}
