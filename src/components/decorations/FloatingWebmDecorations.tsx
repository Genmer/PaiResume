import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

type Region = 'left' | 'right' | 'top' | 'bottom'

interface DecorationAsset {
  id: string
  src: string
}

interface DecorationPlacement {
  asset: DecorationAsset
  x: number
  y: number
  width: number
  opacity: number
  region: Region
  rotation: number
  delay: number
}

const STORAGE_KEY = 'pai-decorations-enabled'
const POSITION_KEY = 'pai-decorations-toggle-pos'
const DECORATION_IMPORTS = import.meta.glob('../../static/webm/*.webp', { eager: true }) as Record<string, { default: string }>

const DECORATION_ASSETS: DecorationAsset[] = Object.entries(DECORATION_IMPORTS).map(([path, mod]) => ({
  id: path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? path,
  src: mod.default,
}))

const MAX_DECORATIONS = 10
const REFRESH_INTERVAL_MS = 10 * 60 * 1000

const PAGE_REGION_PLAN: Record<string, Region[]> = {
  home: ['left', 'right', 'bottom'],
  dashboard: ['left', 'right'],
  login: ['left', 'right', 'top', 'bottom'],
  register: ['left', 'right', 'top', 'bottom'],
  editor: ['left', 'right', 'bottom'],
  fieldOptimize: ['left', 'right'],
  admin: ['left', 'right'],
  showcase: ['left', 'right', 'bottom'],
  survey: ['left', 'right', 'bottom'],
  chromePreview: [],
  unknown: ['left', 'right'],
}

function hashString(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function createSeededRandom(seed: number) {
  let value = seed % 2147483647
  if (value <= 0) {
    value += 2147483646
  }

  return () => {
    value = value * 16807 % 2147483647
    return (value - 1) / 2147483646
  }
}

function shuffleWithRandom<T>(items: T[], random: () => number) {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1))
    ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
  }
  return next
}

function getPageKey(pathname: string) {
  if (pathname === '/') return 'home'
  if (pathname === '/login') return 'login'
  if (pathname === '/register') return 'register'
  if (pathname === '/dashboard') return 'dashboard'
  if (pathname.startsWith('/editor/') && pathname.includes('/modules/')) return 'fieldOptimize'
  if (pathname.startsWith('/editor/')) return 'editor'
  if (pathname.startsWith('/preview/')) return 'chromePreview'
  if (pathname === '/admin') return 'admin'
  if (pathname.startsWith('/showcases/')) return 'showcase'
  if (pathname === '/survey') return 'survey'
  return 'unknown'
}

function getSafeBounds(pageKey: string, width: number, height: number) {
  if (pageKey === 'login' || pageKey === 'register') {
    const centerWidth = Math.min(520, width * 0.58)
    const centerHeight = Math.min(680, height * 0.72)
    return {
      leftLimit: Math.max(24, (width - centerWidth) / 2 - 140),
      rightLimit: Math.max(24, (width - centerWidth) / 2 - 140),
      topBand: Math.max(36, (height - centerHeight) / 2 - 80),
      bottomBand: Math.max(36, (height - centerHeight) / 2 - 80),
    }
  }

  if (pageKey === 'editor' || pageKey === 'fieldOptimize') {
    return {
      leftLimit: 112,
      rightLimit: 112,
      topBand: 84,
      bottomBand: 48,
    }
  }

  const centeredWidth = Math.min(1280, width * 0.88)
  const sideSpace = Math.max(48, (width - centeredWidth) / 2)
  return {
    leftLimit: Math.max(24, sideSpace - 120),
    rightLimit: Math.max(24, sideSpace - 120),
    topBand: 92,
    bottomBand: 56,
  }
}

function buildPlacement(
  asset: DecorationAsset,
  region: Region,
  index: number,
  total: number,
  random: () => number,
  pageKey: string,
  viewportWidth: number,
  viewportHeight: number,
): DecorationPlacement | null {
  const bounds = getSafeBounds(pageKey, viewportWidth, viewportHeight)
  const width = Math.round(86 + random() * 72)
  const heightApprox = width
  const verticalStep = viewportHeight / (Math.max(total, 1) + 1)
  const baseY = Math.round(verticalStep * (index + 1) - heightApprox / 2)
  const yJitter = Math.round((random() - 0.5) * Math.min(120, verticalStep * 0.55))
  const y = Math.max(16, Math.min(viewportHeight - heightApprox - 16, baseY + yJitter))

  if (region === 'left') {
    if (bounds.leftLimit < width * 0.55) {
      return null
    }
    return {
      asset,
      region,
      width,
      x: Math.round(12 + random() * Math.max(12, bounds.leftLimit - width)),
      y,
      opacity: 0.68 + random() * 0.2,
      rotation: Math.round((random() - 0.5) * 14),
      delay: Number((random() * 2.2).toFixed(2)),
    }
  }

  if (region === 'right') {
    if (bounds.rightLimit < width * 0.55) {
      return null
    }
    return {
      asset,
      region,
      width,
      x: Math.round(viewportWidth - bounds.rightLimit + random() * Math.max(12, bounds.rightLimit - width) - 12),
      y,
      opacity: 0.68 + random() * 0.2,
      rotation: Math.round((random() - 0.5) * 14),
      delay: Number((random() * 2.2).toFixed(2)),
    }
  }

  if (region === 'top') {
    const usableY = Math.max(24, bounds.topBand - heightApprox)
    const sideWidth = Math.max(bounds.leftLimit, bounds.rightLimit, 100)
    const leftSide = random() > 0.5
    const x = leftSide
      ? Math.round(16 + random() * Math.max(16, sideWidth - width))
      : Math.round(viewportWidth - sideWidth + random() * Math.max(16, sideWidth - width) - 16)
    return {
      asset,
      region,
      width,
      x: Math.max(12, Math.min(viewportWidth - width - 12, x)),
      y: Math.round(12 + random() * usableY),
      opacity: 0.62 + random() * 0.18,
      rotation: Math.round((random() - 0.5) * 12),
      delay: Number((random() * 2.2).toFixed(2)),
    }
  }

  const sideWidth = Math.max(bounds.leftLimit, bounds.rightLimit, 100)
  const leftSide = random() > 0.5
  const x = leftSide
    ? Math.round(16 + random() * Math.max(16, sideWidth - width))
    : Math.round(viewportWidth - sideWidth + random() * Math.max(16, sideWidth - width) - 16)

  return {
    asset,
    region,
    width,
    x: Math.max(12, Math.min(viewportWidth - width - 12, x)),
    y: Math.round(viewportHeight - bounds.bottomBand + random() * Math.max(12, bounds.bottomBand - heightApprox) - 16),
    opacity: 0.62 + random() * 0.18,
    rotation: Math.round((random() - 0.5) * 12),
    delay: Number((random() * 2.2).toFixed(2)),
  }
}

function allocateDecorations(pathname: string, cycleKey: number, viewportWidth: number, viewportHeight: number) {
  const pageKey = getPageKey(pathname)
  if (pageKey === 'chromePreview' || viewportWidth < 640 || DECORATION_ASSETS.length === 0) {
    return [] as DecorationPlacement[]
  }

  const regions = PAGE_REGION_PLAN[pageKey] ?? PAGE_REGION_PLAN.unknown
  if (regions.length === 0) {
    return [] as DecorationPlacement[]
  }

  const seed = hashString(`${pathname}:${cycleKey}:${viewportWidth}:${viewportHeight}`)
  const random = createSeededRandom(seed)
  const assetPool = shuffleWithRandom(DECORATION_ASSETS, random)
  const perPageTarget = 3 + Math.floor(random() * 4)
  const targetCount = Math.min(perPageTarget, MAX_DECORATIONS)
  const selectedAssets = Array.from({ length: targetCount }, (_, index) => assetPool[index % Math.max(1, assetPool.length)])

  return selectedAssets
    .map((asset, index) => buildPlacement(
      asset,
      regions[index % regions.length],
      index,
      selectedAssets.length,
      random,
      pageKey,
      viewportWidth,
      viewportHeight,
    ))
    .filter((placement): placement is DecorationPlacement => placement !== null)
}

function getStoredEnabled(pathname: string): boolean {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored !== null) {
    return stored === 'true'
  }
  return !pathname.startsWith('/editor/')
}

export function FloatingWebmDecorations() {
  const location = useLocation()
  const [enabled, setEnabled] = useState(() => getStoredEnabled(location.pathname))
  const [now, setNow] = useState(() => Date.now())
  const [viewport, setViewport] = useState({ width: typeof window === 'undefined' ? 1440 : window.innerWidth, height: typeof window === 'undefined' ? 900 : window.innerHeight })
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(() => {
    const saved = localStorage.getItem(POSITION_KEY)
    if (saved) {
      try { return JSON.parse(saved) } catch (_e) { return null }
    }
    return null
  })
  const btnRef = useRef<HTMLButtonElement>(null)
  const dragStateRef = useRef<{ anchorX: number; anchorY: number; startX: number; startY: number; moved: boolean } | null>(null)

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const rect = btnRef.current?.getBoundingClientRect()
    const anchorX = rect ? rect.left : (dragPos?.x ?? 0)
    const anchorY = rect ? rect.top : (dragPos?.y ?? 0)
    dragStateRef.current = { anchorX, anchorY, startX: clientX, startY: clientY, moved: false }
  }, [dragPos])

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    const state = dragStateRef.current
    if (!state) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const dx = clientX - state.startX
    const dy = clientY - state.startY
    if (!state.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
    state.moved = true
    const btn = 48
    const maxX = window.innerWidth - btn
    const maxY = window.innerHeight - btn
    setDragPos({
      x: Math.max(0, Math.min(maxX, state.anchorX + dx)),
      y: Math.max(0, Math.min(maxY, state.anchorY + dy)),
    })
  }, [])

  const handleDragEnd = useCallback(() => {
    const state = dragStateRef.current
    if (state?.moved && dragPos) {
      localStorage.setItem(POSITION_KEY, JSON.stringify(dragPos))
    }
    dragStateRef.current = null
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', handleDragEnd)
    document.removeEventListener('touchmove', handleDragMove)
    document.removeEventListener('touchend', handleDragEnd)
  }, [dragPos, handleDragMove])

  const onPointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    handleDragStart(e)
    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
    document.addEventListener('touchmove', handleDragMove)
    document.addEventListener('touchend', handleDragEnd)
  }, [handleDragStart, handleDragMove, handleDragEnd])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null) {
      setEnabled(!location.pathname.startsWith('/editor/'))
    }
  }, [location.pathname])

  const toggleEnabled = useCallback(() => {
    setEnabled(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handle = window.setInterval(() => {
      setNow(Date.now())
    }, 60 * 1000)

    return () => window.clearInterval(handle)
  }, [])

  const cycleKey = Math.floor(now / REFRESH_INTERVAL_MS)
  const placements = useMemo(
    () => enabled ? allocateDecorations(location.pathname, cycleKey, viewport.width, viewport.height) : [],
    [enabled, cycleKey, location.pathname, viewport.height, viewport.width],
  )

  return (
    <>
      <button
        ref={btnRef}
        onMouseDown={onPointerDown}
        onTouchStart={onPointerDown}
        onClick={() => { if (!dragStateRef.current?.moved) toggleEnabled() }}
        className="fixed z-[100] flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-600 shadow-md backdrop-blur-sm transition-shadow hover:shadow-lg border border-gray-200 touch-none select-none cursor-grab active:cursor-grabbing"
        title={enabled ? '关闭小企鹅' : '开启小企鹅'}
        style={dragPos ? { left: dragPos.x, top: dragPos.y } : { top: 16, right: '25%' }}
      >
        <span className="text-sm">🐧</span>
        <span>{enabled ? '关闭' : '开启'}</span>
      </button>

      {placements.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
          {placements.map((placement) => (
            <img
              key={`${location.pathname}-${cycleKey}-${placement.asset.id}-${placement.region}-${placement.x}-${placement.y}`}
              className="absolute rounded-2xl"
              src={placement.asset.src}
              alt=""
              style={{
                left: placement.x,
                top: placement.y,
                width: placement.width,
                opacity: placement.opacity,
                transform: `rotate(${placement.rotation}deg)`,
                filter: 'drop-shadow(0 10px 18px rgba(15, 23, 42, 0.08))',
                animationDelay: `${placement.delay}s`,
              }}
            />
          ))}
        </div>
      )}
    </>
  )
}
