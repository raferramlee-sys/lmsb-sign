import { useRef, useState, useCallback, useEffect } from 'react'

interface SignaturePadProps {
  value: string | null
  onChange: (dataUrl: string | null) => void
  label: string
  disabled?: boolean
}

export default function SignaturePad({ value, onChange, label, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(!value)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateSize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const parent = canvas.parentElement!
      const w = parent.clientWidth
      const h = Math.max(140, Math.min(200, w * 0.35))
      setDimensions({ width: w, height: h })
      canvas.width = w * 2
      canvas.height = h * 2
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(2, 2)
        ctx.strokeStyle = '#1e3a5f'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    if (value) {
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          setIsEmpty(false)
        }
      }
      img.src = value
    }
  }, [value])

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    let clientX: number, clientY: number
    if ('touches' in e) {
      const touch = e.touches[0]
      if (!touch) return null
      clientX = touch.clientX
      clientY = touch.clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    return {
      x: (clientX - rect.left) / dimensions.width * (canvas.width / 2),
      y: (clientY - rect.top) / dimensions.height * (canvas.height / 2),
    }
  }, [dimensions])

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return
    e.preventDefault()
    const pos = getPos(e)
    if (!pos) return
    setIsDrawing(true)
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsEmpty(false)
  }, [disabled, getPos])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return
    e.preventDefault()
    const pos = getPos(e)
    if (!pos) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }, [isDrawing, disabled, getPos])

  const endDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    setIsDrawing(false)
    const canvas = canvasRef.current!
    const dataUrl = canvas.toDataURL('image/png')
    onChange(dataUrl)
  }, [isDrawing, onChange])

  function handleClear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setIsEmpty(true)
      onChange(null)
    }
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div
        className={`border-2 rounded-lg overflow-hidden touch-none ${
          disabled ? 'border-gray-200 bg-gray-50' : isEmpty ? 'border-dashed border-blue-300 bg-blue-50/30' : 'border-solid border-gray-300 bg-white'
        }`}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          className="block w-full cursor-crosshair"
          style={{ touchAction: 'none' }}
        />
      </div>
      {!isEmpty && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="mt-1 text-xs text-red-500 hover:text-red-700"
        >
          ✕ Clear signature
        </button>
      )}
      {isEmpty && !disabled && (
        <p className="mt-1 text-xs text-gray-400">Draw your signature above</p>
      )}
    </div>
  )
}
