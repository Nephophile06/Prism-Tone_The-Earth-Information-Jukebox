/**
 * Graph panel — three honest views:
 *
 *  Series      the actual environmental record at the current scope, with the
 *              selection shaded, the sounding month drawn as a playhead, and
 *              hover / keyboard inspection of exact values.
 *  Waveform    a live tap of the generated audio. Flat and labelled when silent.
 *  Transcript  every caption spoken this session, with copy and download.
 *
 * The audible-layer list lives only in the mapping diagram, so nothing here
 * repeats it.
 *
 * Canvas performance: DPR capped at 1.5, the waveform runs at 30 fps and
 * pauses when the tab is hidden or the panel is offscreen. The series view
 * has no animation loop at all — it redraws only when the selection or
 * playhead changes. An annual-means table is available for assistive tech.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePreview } from '../state/PreviewContext'
import { monthlyArray, annualArray, keyToLabel, parseMonthKey } from '../lib/processing'
import { fmtValue } from '../lib/format'
import { engine } from '../lib/sonify'
import { planForStep } from '../lib/music'
import { YEAR_MIN, YEAR_MAX } from '../data/datasets'
import Panel from './Panel'
import Transcript from './Transcript'

const IVORY = 'rgba(242,237,227,'
const EMBER = 'rgba(193,154,91,'

const GRAPH_PANEL_ID = 'pt-graph-panel'

const TABS = [
  { id: 'series', label: 'Series' },
  { id: 'waveform', label: 'Waveform' },
  { id: 'transcript', label: 'Transcript' },
]

/** Scroll the graph panel into view when the transcript is selected. */
export function scrollToTranscriptPanel() {
  if (typeof document === 'undefined') return
  const el = document.getElementById(GRAPH_PANEL_ID)
  if (!el) return
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

export default function GraphPanel() {
  const { state, dispatch } = usePreview()
  const { view } = state
  const activeView = TABS.some((tab) => tab.id === view) ? view : 'series'
  const transcriptCount = (state.transcript || []).length
  const tabRefs = useRef({})

  const select = (id) => {
    dispatch({ type: 'SET_VIEW', view: id })
    /* Tabs are never remounted by a view change, so focusing the existing
       button immediately is safe and does not wait on a frame. */
    tabRefs.current[id]?.focus()
  }

  const onTabKeyDown = (event, index) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End']
    if (!keys.includes(event.key)) return
    event.preventDefault()
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = TABS.length - 1
    select(TABS[next].id)
  }

  const tabs = (
    <div
      className="no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto"
      role="tablist"
      aria-label="Panel view"
    >
      {TABS.map((tab, index) => {
        const selected = activeView === tab.id
        return (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[tab.id] = node
            }}
            id={`pt-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`pt-panel-${tab.id}`}
            aria-label={
              tab.id === 'transcript'
                ? transcriptCount === 0
                  ? 'Transcript, empty'
                  : `Transcript, ${transcriptCount} caption${transcriptCount === 1 ? '' : 's'}`
                : undefined
            }
            tabIndex={selected ? 0 : -1}
            onClick={() => dispatch({ type: 'SET_VIEW', view: tab.id })}
            onKeyDown={(event) => onTabKeyDown(event, index)}
            className={`shrink-0 border px-3 py-1.5 font-ui text-[13px] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory ${
              selected
                ? 'border-ivory/60 bg-ivory/12 text-ivory'
                : 'border-ivory/15 text-cream hover:border-ivory/40 hover:bg-white/5 hover:text-ivory'
            }`}
          >
            {tab.label}
            {tab.id === 'transcript' && (
              <span aria-hidden="true" className="ml-1.5 font-data text-[12px] text-beige">{transcriptCount}</span>
            )}
          </button>
        )
      })}
    </div>
  )

  return (
    <div id={GRAPH_PANEL_ID} className="h-full flex flex-col scroll-mt-24">
      <Panel title="Graphs" meta={`${YEAR_MIN}–${YEAR_MAX} · NASA POWER`} actions={tabs}>
        {activeView === 'series' && (
          <div role="tabpanel" id="pt-panel-series" aria-labelledby="pt-tab-series" tabIndex={0}>
            <SeriesGraph />
          </div>
        )}
        {activeView === 'waveform' && (
          <div role="tabpanel" id="pt-panel-waveform" aria-labelledby="pt-tab-waveform" tabIndex={0}>
            <WaveformGraph />
          </div>
        )}
        {activeView === 'transcript' && (
          <div role="tabpanel" id="pt-panel-transcript" aria-labelledby="pt-tab-transcript" tabIndex={0}>
            <Transcript />
          </div>
        )}
      </Panel>
    </div>
  )
}

/* ---------------- series ---------------- */

function SeriesGraph() {
  const { state, dispatch, seriesMap, variable, mappingRange, normalByMonth, steps, hasSelectedTrack } = usePreview()
  const { granularity } = state
  const canvasRef = useRef(null)
  const [cursor, setCursor] = useState(null)

  const points = useMemo(() => {
    if (!hasSelectedTrack || !seriesMap) return []
    return granularity === 'monthly'
      ? monthlyArray(seriesMap, YEAR_MIN, YEAR_MAX)
      : annualArray(seriesMap, YEAR_MIN, YEAR_MAX)
  }, [seriesMap, granularity, hasSelectedTrack])

  const labelFor = (i) => (granularity === 'monthly' ? keyToLabel(points[i].key) : String(points[i].year))
  const valueFor = (i) => points[i].value

  const band = useMemo(() => {
    if (!points.length) return null
    if (granularity === 'annual') {
      const yearIdx = (year) => points.findIndex((p) => p.year === year)
      let a
      let b
      if (state.timeMode === 'range') {
        a = yearIdx(state.range.startYear)
        b = yearIdx(state.range.endYear)
      } else {
        a = yearIdx(state.year)
        b = a
      }
      return a >= 0 && b >= 0 ? [a, b] : null
    }
    const idx = (key) => points.findIndex((p) => p.key === key)
    if (state.timeMode === 'month') {
      const i = idx(`${state.year}${String(state.month).padStart(2, '0')}`)
      return i >= 0 ? [i, i] : null
    }
    if (state.timeMode === 'year') {
      const a = idx(`${state.year}01`)
      const b = idx(`${state.year}12`)
      return a >= 0 && b >= 0 ? [a, b] : null
    }
    const a = idx(`${state.range.startYear}01`)
    const b = idx(`${state.range.endYear}12`)
    return a >= 0 && b >= 0 ? [a, b] : null
  }, [points, granularity, state.timeMode, state.year, state.month, state.range.startYear, state.range.endYear])

  const playhead = useMemo(() => {
    if (state.playState === 'idle') return null
    const step = steps[state.position]
    if (!step) return null
    if (granularity === 'annual') {
      const year = Number(String(step.key).slice(0, 4))
      const i = points.findIndex((p) => p.year === year)
      return i >= 0 ? i : null
    }
    const i = points.findIndex((p) => p.key === step.key)
    return i >= 0 ? i : null
  }, [state.playState, state.position, steps, points, granularity])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0

    const draw = () => {
      try {
        const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      ctx.strokeStyle = IVORY + '0.16)'
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1)

      if (!hasSelectedTrack || !points.length) {
        ctx.fillStyle = IVORY + '0.75)'
        ctx.font = '12px Oxanium, monospace'
        ctx.textAlign = 'center'
        ctx.fillText(hasSelectedTrack ? 'NO DATA LOADED' : 'NO DATA TRACK SELECTED', w / 2, h / 2 - 8)
        ctx.font = '11px Outfit, sans-serif'
        ctx.fillStyle = IVORY + '0.45)'
        ctx.fillText(
          hasSelectedTrack ? 'Check connection or retry' : 'Select a data track above to inspect time series',
          w / 2,
          h / 2 + 14,
        )
        return
      }

      const padL = 8
      const padR = 10
      const padT = 12
      const padB = 24
      const iw = w - padL - padR
      const ih = h - padT - padB

      const vals = points.filter((p) => p.value !== null).map((p) => p.value)
      if (!vals.length) {
        ctx.fillStyle = IVORY + '0.75)'
        ctx.font = '12px Oxanium, monospace'
        ctx.textAlign = 'center'
        ctx.fillText('NO VALID VALUES IN RECORD', w / 2, h / 2)
        return
      }
      let lo = Math.min(...vals)
      let hi = Math.max(...vals)
      if (lo === hi) {
        lo -= 1
        hi += 1
      }
      const span = hi - lo
      lo -= span * 0.06
      hi += span * 0.06

      const x = (i) => padL + (i / Math.max(points.length - 1, 1)) * iw
      const y = (v) => padT + ih - ((v - lo) / (hi - lo)) * ih

      if (band) {
        const bx0 = x(band[0])
        const bx1 = x(band[1])
        ctx.fillStyle = IVORY + '0.08)'
        ctx.fillRect(bx0, padT, Math.max(bx1 - bx0, 2), ih)
      }

      ctx.font = '12px Oxanium, monospace'
      ctx.textAlign = 'left'
      for (let g = 0; g <= 3; g++) {
        const gv = lo + ((hi - lo) * g) / 3
        const gy = y(gv)
        ctx.strokeStyle = IVORY + '0.08)'
        ctx.beginPath()
        ctx.moveTo(padL, gy)
        ctx.lineTo(padL + iw, gy)
        ctx.stroke()
        ctx.fillStyle = IVORY + '0.7)'
        ctx.fillText(fmtValue(gv, variable.decimals), padL + 3, gy - 3)
      }

      ctx.textAlign = 'center'
      for (let i = 0; i < points.length; i++) {
        const yr = granularity === 'monthly' ? Number(points[i].key.slice(0, 4)) : points[i].year
        const show = granularity === 'monthly' ? yr % 10 === 0 && points[i].key.endsWith('01') : yr % 10 === 0
        if (show) {
          ctx.fillStyle = IVORY + '0.7)'
          ctx.fillText(String(yr), x(i), h - 7)
        }
      }

      // Climate benchmark: 1991–2020 normal reference line
      if (normalByMonth) {
        const normVals = Object.values(normalByMonth).filter((v) => typeof v === 'number')
        if (normVals.length >= 6) {
          const normAvg = normVals.reduce((a, b) => a + b, 0) / normVals.length
          if (normAvg >= lo && normAvg <= hi) {
            const ny = y(normAvg)
            ctx.strokeStyle = 'rgba(193, 154, 91, 0.4)'
            ctx.lineWidth = 1
            ctx.setLineDash([4, 4])
            ctx.beginPath()
            ctx.moveTo(padL, ny)
            ctx.lineTo(padL + iw, ny)
            ctx.stroke()
            ctx.setLineDash([])
            ctx.fillStyle = 'rgba(193, 154, 91, 0.65)'
            ctx.font = '10px Oxanium, monospace'
            ctx.textAlign = 'right'
            ctx.fillText('1991–2020 normal', padL + iw - 4, ny - 3)
          }
        }
      }

      const isMonthly = granularity === 'monthly'

      // Layer 1: Background seasonal monthly trace (subtle, fine texture)
      if (isMonthly) {
        ctx.beginPath()
        let started = false
        for (let i = 0; i < points.length; i++) {
          if (points[i].value !== null && points[i].value !== undefined) {
            const px = x(i)
            const py = y(points[i].value)
            if (!started) {
              ctx.moveTo(px, py)
              started = true
            } else {
              ctx.lineTo(px, py)
            }
          }
        }
        ctx.strokeStyle = 'rgba(242, 237, 227, 0.15)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Layer 2: Primary Climate Trajectory Wave (12-month rolling trend in monthly, or annual curve)
      const trendPoints = []
      const win = isMonthly ? 12 : 3
      const halfWin = Math.floor(win / 2)

      for (let i = 0; i < points.length; i++) {
        if (points[i].value !== null && points[i].value !== undefined) {
          if (isMonthly) {
            let sum = 0
            let count = 0
            const start = Math.max(0, i - halfWin)
            const end = Math.min(points.length - 1, i + halfWin)
            for (let j = start; j <= end; j++) {
              if (points[j].value !== null && points[j].value !== undefined) {
                sum += points[j].value
                count++
              }
            }
            const avgVal = count > 0 ? sum / count : points[i].value
            trendPoints.push({ x: x(i), y: y(avgVal) })
          } else {
            trendPoints.push({ x: x(i), y: y(points[i].value) })
          }
        }
      }

      if (trendPoints.length > 1) {
        // Multi-stop luminous gradient fill under the wave for depth
        const grad = ctx.createLinearGradient(0, padT, 0, padT + ih)
        grad.addColorStop(0, 'rgba(217, 140, 95, 0.26)')
        grad.addColorStop(0.45, 'rgba(242, 237, 227, 0.08)')
        grad.addColorStop(1, 'rgba(16, 18, 18, 0.0)')

        ctx.beginPath()
        ctx.moveTo(trendPoints[0].x, trendPoints[0].y)
        for (let i = 0; i < trendPoints.length - 1; i++) {
          const p0 = trendPoints[i]
          const p1 = trendPoints[i + 1]
          const midX = (p0.x + p1.x) / 2
          const midY = (p0.y + p1.y) / 2
          ctx.quadraticCurveTo(p0.x, p0.y, midX, midY)
        }
        const last = trendPoints[trendPoints.length - 1]
        ctx.lineTo(last.x, last.y)
        ctx.lineTo(last.x, padT + ih)
        ctx.lineTo(trendPoints[0].x, padT + ih)
        ctx.closePath()
        ctx.fillStyle = grad
        ctx.fill()

        // Crisp, refined primary trajectory line
        ctx.strokeStyle = 'rgba(247, 243, 235, 0.98)'
        ctx.lineWidth = 2.2
        ctx.lineJoin = 'round'
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(trendPoints[0].x, trendPoints[0].y)
        for (let i = 0; i < trendPoints.length - 1; i++) {
          const p0 = trendPoints[i]
          const p1 = trendPoints[i + 1]
          const midX = (p0.x + p1.x) / 2
          const midY = (p0.y + p1.y) / 2
          ctx.quadraticCurveTo(p0.x, p0.y, midX, midY)
        }
        ctx.lineTo(last.x, last.y)
        ctx.stroke()
      }

      if (cursor !== null && points[cursor]) {
        const cx = x(cursor)
        ctx.strokeStyle = EMBER + '0.9)'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(cx, padT)
        ctx.lineTo(cx, padT + ih)
        ctx.stroke()
        ctx.setLineDash([])
        if (points[cursor].value !== null) {
          const cy = y(points[cursor].value)
          ctx.fillStyle = 'rgba(217, 140, 95, 0.25)'
          ctx.beginPath()
          ctx.arc(cx, cy, 6, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = EMBER + '1)'
          ctx.beginPath()
          ctx.arc(cx, cy, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      if (playhead !== null && points[playhead]) {
        const px = x(playhead)
        ctx.strokeStyle = EMBER + '1)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(px, padT)
        ctx.lineTo(px, padT + ih)
        ctx.stroke()
        if (points[playhead].value !== null) {
          const py = y(points[playhead].value)
          ctx.fillStyle = 'rgba(217, 140, 95, 0.35)'
          ctx.beginPath()
          ctx.arc(px, py, 6, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = EMBER + '1)'
          ctx.beginPath()
          ctx.arc(px, py, 3.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      } catch (err) {
        console.error('Graph draw error:', err)
      }
    }

    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        draw()
      })
    }

    draw()
    const ro = new ResizeObserver(schedule)
    ro.observe(canvas)
    return () => {
      ro.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [points, band, playhead, cursor, granularity, variable.decimals])

  const previewCursor = (index) => {
    if (!state.settings.hoverSonify || state.playState !== 'idle') return
    const point = points[index]
    if (!point || point.value === null) return
    const { month } = point.key ? parseMonthKey(point.key) : { month: null }
    const plan = planForStep({
      variable,
      step: point,
      normal: month && normalByMonth ? normalByMonth[month] : null,
      range: mappingRange,
      prevValue: index > 0 ? points[index - 1].value : null,
    })
    engine.previewPoint(plan)
  }

  const onMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas || !points.length) return
    const rect = canvas.getBoundingClientRect()
    const fx = (e.clientX - rect.left - 8) / Math.max(rect.width - 18, 1)
    const i = Math.round(fx * (points.length - 1))
    const next = Math.max(0, Math.min(i, points.length - 1))
    setCursor(next)
    previewCursor(next)
  }

  const cursorValid = cursor !== null && points[cursor]

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5" role="group" aria-label="Series granularity">
          {[
            ['monthly', 'Monthly'],
            ['annual', 'Annual'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={granularity === id}
              onClick={() => dispatch({ type: 'SET_GRANULARITY', granularity: id })}
              className={`border px-2.5 py-1.5 font-ui text-[13px] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory ${
                granularity === id
                  ? 'border-ivory/60 bg-ivory/12 text-ivory'
                  : 'border-ivory/15 text-cream hover:border-ivory/40 hover:text-ivory'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2.5 font-ui text-[13px] text-cream">
          {state.settings.hoverSonify && (
            <>
              <span className="text-parchment/90">hover to hear a preview</span>
              <span className="text-ivory/25" aria-hidden="true">·</span>
            </>
          )}
          <span>
            {granularity === 'monthly' ? 'monthly values' : 'annual means'} · {variable.unit}
          </span>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="block h-72 sm:h-80 md:h-[330px] lg:h-[350px] w-full cursor-crosshair"
          onMouseMove={onMove}
          onMouseLeave={() => setCursor(null)}
          tabIndex={0}
          role="img"
          aria-label={`Time series of ${variable.name.toLowerCase()} at the selected scope, ${YEAR_MIN} to ${YEAR_MAX}. Use the inspection slider or arrow keys for exact values. An annual-means table follows below.`}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
            e.preventDefault()
            setCursor((c) => {
              const next = c === null ? 0 : c + (e.key === 'ArrowRight' ? 1 : -1)
              const clamped = Math.max(0, Math.min(next, Math.max(points.length - 1, 0)))
              previewCursor(clamped)
              return clamped
            })
          }}
        />
        {cursorValid && (
          <div
            className="pointer-events-none absolute top-1.5 border border-ivory/25 bg-ink/95 px-2 py-1 font-data text-[12.5px] text-cream"
            style={{ left: '50%', transform: 'translateX(-50%)' }}
          >
            {labelFor(cursor)} — {valueFor(cursor) !== null ? `${fmtValue(valueFor(cursor), variable.decimals)} ${variable.unit}` : 'no data'}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <label htmlFor="pt-inspect" className="shrink-0 font-ui text-[13px] text-cream">
          Inspect
        </label>
        <input
          id="pt-inspect"
          type="range"
          className="pt-range min-w-[100px] flex-1"
          min={0}
          max={Math.max(points.length - 1, 0)}
          value={cursor ?? 0}
          disabled={!hasSelectedTrack || points.length === 0}
          onChange={(e) => {
            const next = Number(e.target.value)
            setCursor(next)
            previewCursor(next)
          }}
          aria-label="Inspect a point in the series"
        />
        <span className="shrink-0 font-data text-[12.5px] text-cream sm:text-right">
          {cursorValid
            ? `${labelFor(cursor)} · ${valueFor(cursor) !== null ? fmtValue(valueFor(cursor), variable.decimals) : '—'}`
            : (hasSelectedTrack ? 'hover or focus the graph' : 'select a track to inspect')}
        </span>
      </div>
    </div>
  )
}

/* ---------------- waveform ---------------- */

function WaveformGraph() {
  const canvasRef = useRef(null)
  const { state } = usePreview()
  const playing = state.playState === 'playing'
  const reduceMotion = state.settings.reduceMotion

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let raf = 0
    let lastDraw = 0
    let visible = true
    const buf = new Float32Array(2048)
    const POINT_COUNT = 96
    const smoothed = new Float32Array(POINT_COUNT)
    let currentScale = 3.5

    const draw = (now = performance.now()) => {
      const analyser = engine.analyser
      const live = analyser && playing && !document.hidden && visible

      // Calmer frame rate: 30 fps (or 20 fps for reduceMotion) for smooth, non-flickering motion
      const frameInterval = reduceMotion ? 50 : 33
      if (live && now - lastDraw < frameInterval) {
        raf = requestAnimationFrame(draw)
        return
      }
      lastDraw = now

      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) {
        if (live) raf = requestAnimationFrame(draw)
        return
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const targetW = Math.round(w * dpr)
      const targetH = Math.round(h * dpr)
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW
        canvas.height = targetH
      }

      const ctx = canvas.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // Clean, minimalist dark container
      ctx.fillStyle = 'rgba(12, 14, 15, 0.65)'
      ctx.fillRect(0, 0, w, h)
      ctx.strokeStyle = IVORY + '0.14)'
      ctx.strokeRect(0.5, 0.5, w - 1, h - 1)

      const mid = h / 2
      const padX = 24
      const plotW = Math.max(10, w - padX * 2)

      // Minimalist reference guide lines
      ctx.strokeStyle = IVORY + '0.04)'
      ctx.setLineDash([3, 4])
      ctx.beginPath()
      ctx.moveTo(padX, mid - mid * 0.70)
      ctx.lineTo(w - padX, mid - mid * 0.70)
      ctx.moveTo(padX, mid + mid * 0.70)
      ctx.lineTo(w - padX, mid + mid * 0.70)
      ctx.stroke()
      ctx.setLineDash([])

      // Subtle center baseline
      ctx.strokeStyle = IVORY + '0.14)'
      ctx.beginPath()
      ctx.moveTo(padX, mid)
      ctx.lineTo(w - padX, mid)
      ctx.stroke()

      if (live) {
        try {
          if (typeof analyser.getFloatTimeDomainData === 'function') analyser.getFloatTimeDomainData(buf)
          else if (typeof analyser.getValue === 'function') buf.set(analyser.getValue())
        } catch { /* analyser not ready */ }

        // Find peak amplitude for adaptive gain
        let peak = 0
        for (let i = 0; i < buf.length; i++) {
          const abs = Math.abs(buf[i])
          if (abs > peak) peak = abs
        }

        // Adaptive scaling so active audio rises prominently (reaches ~55-75% height)
        const targetScale = peak > 0.003 ? Math.min(8.5, Math.max(2.8, 0.62 / peak)) : 3.5
        currentScale += (targetScale - currentScale) * 0.08

        // Zero-crossing trigger search to stabilize waveform phase
        let triggerIndex = 0
        for (let i = 0; i < Math.min(800, buf.length - POINT_COUNT * 2); i++) {
          if (buf[i] < 0 && buf[i + 1] >= 0) {
            triggerIndex = i
            break
          }
        }

        const available = buf.length - triggerIndex
        const step = Math.max(1, Math.floor(available / POINT_COUNT))

        for (let i = 0; i < POINT_COUNT; i++) {
          const raw = buf[triggerIndex + i * step] || 0
          // Smooth interpolation dampens rapid jitter while letting true wave shapes emerge
          smoothed[i] += (raw - smoothed[i]) * 0.22
        }

        // Build smooth curve coordinates
        const pts = []
        for (let i = 0; i < POINT_COUNT; i++) {
          const px = padX + (i / (POINT_COUNT - 1)) * plotW
          const amplified = Math.max(-0.95, Math.min(0.95, smoothed[i] * currentScale))
          const py = mid + amplified * (mid * 0.72)
          pts.push({ x: px, y: py })
        }

        if (pts.length > 1) {
          // Soft, soothing gradient fill to center line
          ctx.beginPath()
          ctx.moveTo(pts[0].x, mid)
          for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i]
            const p1 = pts[i + 1]
            const mx = (p0.x + p1.x) / 2
            const my = (p0.y + p1.y) / 2
            ctx.quadraticCurveTo(p0.x, p0.y, mx, my)
          }
          ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
          ctx.lineTo(pts[pts.length - 1].x, mid)
          ctx.closePath()

          const grad = ctx.createLinearGradient(0, mid - mid * 0.65, 0, mid + mid * 0.65)
          grad.addColorStop(0, 'rgba(217, 140, 95, 0.22)')
          grad.addColorStop(0.5, 'rgba(242, 237, 227, 0.02)')
          grad.addColorStop(1, 'rgba(193, 154, 91, 0.18)')
          ctx.fillStyle = grad
          ctx.fill()

          // Elegant, smooth main wave trace
          ctx.strokeStyle = 'rgba(247, 243, 235, 0.92)'
          ctx.lineWidth = 1.8
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.beginPath()
          ctx.moveTo(pts[0].x, pts[0].y)
          for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i]
            const p1 = pts[i + 1]
            const mx = (p0.x + p1.x) / 2
            const my = (p0.y + p1.y) / 2
            ctx.quadraticCurveTo(p0.x, p0.y, mx, my)
          }
          ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
          ctx.stroke()
        }

        if (!document.hidden && visible) raf = requestAnimationFrame(draw)
      } else {
        // Smoothly decay to flat line when not playing
        for (let i = 0; i < POINT_COUNT; i++) {
          smoothed[i] += (0 - smoothed[i]) * 0.08
        }

        ctx.fillStyle = IVORY + '0.75)'
        ctx.font = '12px Oxanium, monospace'
        ctx.textAlign = 'center'
        ctx.fillText(
          state.playState === 'paused'
            ? 'PAUSED — RESUME TO WATCH AUDIO WAVE'
            : 'AUDIO WAVEFORM — PLAY TO VIEW LIVE SOUND',
          w / 2,
          mid - 12,
        )

        ctx.font = '11.5px Outfit, sans-serif'
        ctx.fillStyle = IVORY + '0.40)'
        ctx.fillText(
          'Center line indicates zero sound level',
          w / 2,
          mid + 18,
        )
      }
    }

    draw()

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible && playing) {
          if (raf) cancelAnimationFrame(raf)
          raf = requestAnimationFrame(draw)
        }
      },
      { threshold: 0.05 },
    )
    io.observe(canvas)

    const onVis = () => {
      if (!document.hidden && playing && visible) {
        if (raf) cancelAnimationFrame(raf)
        raf = requestAnimationFrame(draw)
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [playing, reduceMotion, state.playState])

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-ui text-[13.5px] leading-relaxed text-cream">
          Live visual waveform of the music. Silence gently rests on the center line.
        </p>
        <div className="flex items-center gap-2 font-data text-[12px] text-cream">
          <span className="flex items-center gap-1.5 border border-ivory/15 bg-white/[0.04] px-2.5 py-0.5">
            <span
              className={`h-2 w-2 rounded-full ${
                playing ? 'bg-ember animate-pulse' : 'bg-cream/40'
              }`}
              aria-hidden="true"
            />
            {playing ? 'Active' : 'Standby'}
          </span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="block h-72 sm:h-80 md:h-[330px] lg:h-[350px] w-full"
        role="img"
        aria-label="Real-time waveform of the generated sonification audio. When playback is stopped or paused, the line is flat."
      />
      <div className="mt-3 flex items-center justify-between font-ui text-[12px] text-cream/70">
        <span>Time-domain oscilloscope tap</span>
        <span className="font-data">44.1 kHz · 2048 FFT</span>
      </div>
    </div>
  )
}

/* ---------------- data table panel ---------------- */

export function DataTablePanel() {
  const { seriesMap, variable, hasSelectedTrack } = usePreview()

  const annualTable = useMemo(() => {
    if (!hasSelectedTrack || !seriesMap) return []
    return annualArray(seriesMap, YEAR_MIN, YEAR_MAX)
  }, [seriesMap, hasSelectedTrack])

  const validCount = annualTable.filter((p) => p.value !== null).length

  return (
    <Panel
      title="Data table"
      meta={`${YEAR_MIN}–${YEAR_MAX}`}
      actions={
        <span className="font-data text-[13px] font-medium text-beige">
          {hasSelectedTrack ? `${validCount} years` : 'No track'}
        </span>
      }
    >
      <div className="flex flex-1 flex-col min-h-0">
        <p className="mb-2 shrink-0 font-ui text-[14px] leading-snug text-cream font-medium">
          {hasSelectedTrack
            ? `Annual means · ${variable.name} (${variable.unit})`
            : 'Annual means · No track selected'}
        </p>
        <div
          className="h-[365px] sm:h-[385px] md:h-[405px] lg:h-[425px] overflow-y-auto border border-ivory/15 bg-black/30 pr-1 data-tracks-scroll"
          data-lenis-prevent
        >
          {hasSelectedTrack ? (
            <table className="w-full border-collapse font-ui">
              <thead className="sticky top-0 z-10 bg-[#161819] border-b border-ivory/20 shadow-md">
                <tr className="text-left">
                  <th scope="col" className="py-2 px-3.5 font-ui text-[14px] sm:text-[14.5px] text-ivory font-semibold">
                    Year
                  </th>
                  <th scope="col" className="py-2 px-3.5 text-right font-ui text-[14px] sm:text-[14.5px] text-ivory font-semibold">
                    {variable.unit}
                  </th>
                </tr>
              </thead>
              <tbody>
                {annualTable.map((p) => (
                  <tr key={p.year} className="border-b border-ivory/10 hover:bg-white/[0.04] transition-colors">
                    <th scope="row" className="py-2 px-3.5 text-left font-data text-[15px] sm:text-[15.5px] font-medium text-cream">
                      {p.year}
                    </th>
                    <td className="py-2 px-3.5 text-right font-data text-[15px] sm:text-[15.5px] font-semibold text-ivory">
                      {p.value !== null ? fmtValue(p.value, variable.decimals) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-6 text-center">
              <p className="font-ui text-[14px] text-cream">No data track selected</p>
              <p className="mt-1 font-ui text-[12px] text-beige">
                Select a track above to view annual records
              </p>
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
