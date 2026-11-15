/**
 * Data summary — the selected scope and period, computed only from the
 * validated series. Everything unavailable is labelled instead of guessed.
 *
 * The live value belongs to the caption bar, so this panel leads with the
 * scope and the trend, then the selection’s statistics.
 */

import { memo, useState, useRef, useEffect } from 'react'
import { usePreview } from '../state/PreviewContext'
import { selectionSummary, sparklineWindow } from '../lib/selectors'
import { fmtValue, fmtDelta, fmtPct, fmtTime } from '../lib/format'
import { YEAR_MIN, YEAR_MAX, BASELINE, SOURCE } from '../data/datasets'
import { CONTINENT_BY_ID } from '../data/world'
import Sparkline from './Sparkline'
import Panel from './Panel'

function SummaryPanel() {
  const { state, steps, seriesMap, variable, actions, hasSelectedTrack } = usePreview()
  const [summaryPlaying, setSummaryPlaying] = useState(false)
  const summaryTimerRef = useRef(null)

  const handlePlaySummary = () => {
    if (!hasSelectedTrack) {
      actions.playSummary()
      return
    }
    actions.playSummary()
    setSummaryPlaying(true)
    if (summaryTimerRef.current) clearTimeout(summaryTimerRef.current)
    summaryTimerRef.current = setTimeout(() => {
      setSummaryPlaying(false)
    }, 6000)
  }

  useEffect(() => {
    return () => {
      if (summaryTimerRef.current) clearTimeout(summaryTimerRef.current)
    }
  }, [])

  if (state.data.status === 'loading' || state.data.status === 'idle') {
    return (
      <Panel title="Data summary">
        <div role="status" aria-label="Data summary">
          <p className="font-ui text-[15px] leading-relaxed text-ivory">
            Retrieving the NASA POWER global climate record…
          </p>
        </div>
      </Panel>
    )
  }

  if (state.data.status === 'error') {
    return (
      <Panel title="Data summary">
        <div role="alert" aria-label="Data summary">
          <p className="font-ui text-[15px] leading-relaxed text-ivory">
            No summary can be shown — the NASA POWER data could not be retrieved. The map and controls stay
            available; retry from the status banner when your connection is back.
          </p>
        </div>
      </Panel>
    )
  }

  const s = selectionSummary({
    state,
    variable,
    seriesMap,
    steps,
    position: state.position,
    playState: state.playState,
  })
  const spark = hasSelectedTrack
    ? sparklineWindow({ state, seriesMap, steps, position: state.position })
    : { points: [], current: -1 }
  const scopeName = state.scope.type === 'division' && CONTINENT_BY_ID[state.scope.id]
    ? CONTINENT_BY_ID[state.scope.id].name
    : 'World'
  const scopeColor = state.scope.type === 'division' && CONTINENT_BY_ID[state.scope.id]
    ? CONTINENT_BY_ID[state.scope.id].color
    : '#c19a5b'
  const hasComparison = hasSelectedTrack && s.normal !== null && s.delta !== null

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-2 border border-ivory/20 bg-white/[0.04] px-2.5 py-1 font-ui text-[13px] text-ivory">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: scopeColor }} aria-hidden="true" />
        {scopeName}
      </span>
      <span className="font-ui text-[13px] text-cream">
        {hasSelectedTrack ? s.selectionLabel : 'No track'}
      </span>
    </div>
  )

  return (
    <Panel title="Data summary" actions={header}>
      <Sparkline
        points={spark.points}
        current={spark.current}
        normal={hasSelectedTrack ? s.normal : null}
        decimals={variable.decimals}
        unit={variable.unit}
        label={
          hasSelectedTrack
            ? `${variable.name} trend ending at the current selection. Dashed line is the 1991–2020 normal.`
            : 'No data track selected'
        }
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handlePlaySummary}
          className={`inline-flex shrink-0 items-center gap-1.5 border px-2.5 py-1 font-ui text-[12.5px] transition-all cursor-pointer ${
            summaryPlaying
              ? 'border-ember bg-ember/20 text-ember'
              : 'border-ivory/40 bg-ivory/10 text-ivory hover:border-ivory/70 hover:bg-ivory/20'
          } focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory`}
        >
          {summaryPlaying ? (
            <>
              <span className="flex items-center gap-0.5" aria-hidden="true">
                <span className="h-2 w-0.5 animate-pulse bg-ember" />
                <span className="h-3 w-0.5 animate-pulse bg-ember" />
                <span className="h-2 w-0.5 animate-pulse bg-ember" />
              </span>
              Playing motif (6s)
            </>
          ) : (
            <>
              <svg width="8" height="9" viewBox="0 0 10 12" aria-hidden="true">
                <path d="M1 1 L9 6 L1 11 Z" fill="currentColor" />
              </svg>
              Hear summary
            </>
          )}
        </button>
        <span className="font-ui text-[11.5px] leading-tight text-cream/80">
          6s motif of range, mean & anomaly
        </span>
      </div>

      <dl className="mt-3.5 grid grid-cols-3 gap-x-4 gap-y-3">
        <div className="space-y-3">
          <SummaryStat label="Minimum" value={hasSelectedTrack ? s.selMin : null} decimals={variable.decimals} unit={variable.unit} />
          <SummaryStat label="Mean" value={hasSelectedTrack ? s.selMean : null} decimals={variable.decimals} unit={variable.unit} />
        </div>
        <div className="space-y-3">
          <SummaryStat label="Maximum" value={hasSelectedTrack ? s.selMax : null} decimals={variable.decimals} unit={variable.unit} />
          <div>
            <dt className="font-ui text-[12.5px] text-cream">
              vs {BASELINE.start}–{BASELINE.end} normal
            </dt>
            <dd className="mt-0.5 font-data text-[14px] text-ivory">
              {hasComparison ? (
                <>
                  {fmtDelta(s.delta, variable.decimals, variable.unit)}{' '}
                  {Math.abs(s.normal) > 0.05 && (
                    <span className="font-ui text-[11.5px] text-cream">({fmtPct((s.delta / s.normal) * 100)})</span>
                  )}
                </>
              ) : (
                <span className="font-ui text-[12px] text-cream">—</span>
              )}
            </dd>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <dt className="font-ui text-[12.5px] text-cream">Coverage</dt>
            <dd className="mt-0.5 font-data text-[14px] text-ivory">
              {hasSelectedTrack ? (
                <>
                  {s.validCount}/{s.totalCount} periods
                  {s.coverage < 1 && s.totalCount > 0 && (
                    <span className="block font-ui text-[11.5px] text-cream">({Math.round(s.coverage * 100)}% valid)</span>
                  )}
                </>
              ) : (
                <span className="font-ui text-[12px] text-cream">—</span>
              )}
            </dd>
          </div>
        </div>
      </dl>

      <ProvenanceStrip state={state} variable={variable} hasSelectedTrack={hasSelectedTrack} />
    </Panel>
  )
}

/**
 * The provenance strip answers "where did these numbers come from, exactly?"
 * — the trust question raised by the astronomy-sonification survey. It uses
 * only metadata the app already holds: the retrieval path, the timestamp and
 * the sampled coordinates.
 */
function ProvenanceStrip({ state, variable, hasSelectedTrack = true }) {
  const meta = state.data.meta || {}
  const division = state.scope.type === 'division' ? CONTINENT_BY_ID[state.scope.id] : null
  const coords = coordinateLabel(division)
  const sample = coords ? `${coords} centroid` : '7 centroids planetary mean'
  const viaLabel = {
    backend: 'project API',
    direct: 'NASA POWER API',
    session: 'session cache',
    mixed: 'API and cache',
  }[meta.via] || 'bundled snapshot'
  const retrieved = meta.fetchedAt ? `${fmtTime(meta.fetchedAt)} · ${viaLabel}` : viaLabel

  return (
    <section aria-label="Data provenance" className="mt-4 pt-1">
      <h3 className="font-stencil text-[11px] uppercase tracking-[0.18em] text-beige">Where this comes from</h3>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2.5">
        <ProvRow label="Source" value={hasSelectedTrack ? `${SOURCE.name} · MERRA-2` : '—'} />
        <ProvRow label="Parameter" value={hasSelectedTrack ? `${variable.param} · ${variable.headline || variable.name}` : 'No track selected'} />
        <ProvRow label="Sample" value={hasSelectedTrack ? sample : '—'} />
        <ProvRow label="Retrieved" value={hasSelectedTrack ? retrieved : '—'} />
      </dl>
    </section>
  )
}

function ProvRow({ label, value }) {
  return (
    <div>
      <dt className="font-ui text-[12px] text-beige">{label}</dt>
      <dd className="mt-0.5 font-data text-[12px] leading-snug text-ivory truncate">{value}</dd>
    </div>
  )
}

function coordinateLabel(division) {
  if (!division || !Number.isFinite(division.lat) || !Number.isFinite(division.lon)) return null
  const lat = `${Math.abs(division.lat).toFixed(1)}°${division.lat >= 0 ? 'N' : 'S'}`
  const lon = `${Math.abs(division.lon).toFixed(1)}°${division.lon >= 0 ? 'E' : 'W'}`
  return `${lat}, ${lon}`
}

function SummaryStat({ label, value, decimals, unit, className = '' }) {
  const shown = value !== null && value !== undefined
  return (
    <div className={className}>
      <dt className="font-ui text-[12.5px] text-cream">{label}</dt>
      <dd className="mt-0.5 font-data text-[14px] text-ivory">
        {shown ? `${fmtValue(value, decimals)} ${unit}` : '—'}
      </dd>
    </div>
  )
}

const MemoSummaryPanel = memo(SummaryPanel)

export { MemoSummaryPanel as SummaryPanel }
export default MemoSummaryPanel
