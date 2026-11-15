/**
 * How the selected variable becomes sound.
 *
 * The diagram reads left to right and is driven by the same pure mapping
 * function as the audio engine (lib/music.js), so it can never describe a
 * mapping the engine is not actually performing. Full prose is available
 * in the expandable technical notes inside the popup.
 */

import { memo, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePreview } from '../state/PreviewContext'
import { displayKey } from '../lib/selectors'
import { getMonthly, normalize, parseMonthKey } from '../lib/processing'
import { fmtValue } from '../lib/format'
import { planForStep, layerPlan, midiToName } from '../lib/music'
import { VARIABLE_BY_ID } from '../data/datasets'

/* One sentence per variable, matching scaleFor() in lib/music.js. */
function scaleRule(variable, score) {
  if (variable.id === 'T2M') {
    if (score > 3) return 'More than 0.9 °C warmer than the 1991–2020 normal → D minor. Warmth also brightens the filter.'
    if (score < -2) return 'More than 0.6 °C cooler than the 1991–2020 normal → D major. The cool month keeps the usual register.'
    return 'Between −0.6 and +0.9 °C of the 1991–2020 normal → D Dorian.'
  }
  if (variable.id === 'PRECTOTCORR') {
    return 'G major pentatonic in every month; heavier rain adds marimba notes and brightens the wash.'
  }
  return 'D minor pentatonic in every month; stronger wind weighs the drone and opens the filter.'
}

function MappingPanel() {
  const [open, setOpen] = useState(false)
  const modalRef = useRef(null)
  const { state, seriesMap, variable, mappingRange, steps, normalByMonth } = usePreview()

  useEffect(() => {
    if (!open) return

    window.__lenis?.stop()
    const origBodyOverflow = document.body.style.overflow
    const origHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.__lenis?.start()
      document.body.style.overflow = origBodyOverflow
      document.documentElement.style.overflow = origHtmlOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selectedLayers = (state.selectedVariableIds || [state.variableId])
    .map((id) => VARIABLE_BY_ID[id])
    .filter((v) => v && v.status === 'live')
  const layerCount = selectedLayers.length
  const key = displayKey(state, steps, state.position, state.playState)
  const point = key ? parseMonthKey(key) : null
  const value = point ? getMonthly(seriesMap, point.year, point.month) : (state.caption.value ?? null)
  const normal = point && normalByMonth ? normalByMonth[point.month] ?? null : null
  const range = mappingRange
  const plan = state.soundPlan || planForStep({
    variable,
    step: { key, value },
    normal,
    range,
    prevValue: null,
  })

  /* A backend score chooses one key/scale for the whole selection. When such
     a score is loaded (or sounding), the diagram must not claim the local
     per-month mode changes: it shows that one mode instead. */
  const score = state.score || {}
  const scoreSounding = state.playState !== 'idle' && score.source === 'score'
  const scorePlanned = state.playState === 'idle' && score.status === 'ready'
  const scoreMode = (scoreSounding || scorePlanned) && score.scaleLabel ? score.scaleLabel : null
  const scoreTempo = scoreMode && Number.isFinite(score.tempo) ? Math.round(score.tempo) : null
  const rule = scoreMode
    ? `Project score mode: ${scoreMode}${scoreTempo ? ` at ${scoreTempo} bpm` : ''}. The key and scale are chosen once for the whole selection; the chord does not change mode month to month.`
    : scaleRule(variable, plan.score)

  const norm = value !== null && range && range.hi !== range.lo
    ? normalize(value, range.lo, range.hi)
    : null
  const scaleNotes = plan.scaleMidi || []
  const layers = layerPlan(plan, variable)
  const m = variable.mapping

  return (
    <>
      {/* End-of-page interactive button trigger */}
      <section aria-label="Sonification mapping trigger" className="mt-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-ivory/15 bg-coal/50 p-4 sm:p-5">
          <div className="flex items-center gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-ember/40 bg-ember/15 text-ember" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </span>
            <div>
              <span className="font-stencil text-[10.5px] uppercase tracking-[0.2em] text-ember font-medium">
                Sonification Logic
              </span>
              <h3 className="font-ui text-[16px] font-semibold text-ivory">
                How {variable.name.toLowerCase()} becomes sound
              </h3>
              <p className="font-ui text-[12.5px] text-cream">
                View the live 4-step mathematical translation from atmospheric measurements to musical harmony
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 border border-ivory/30 bg-ivory/10 px-4 py-2 font-ui text-[13.5px] font-medium text-ivory hover:border-ivory/70 hover:bg-ivory/20 transition-all cursor-pointer shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
          >
            <span>Open Mapping Diagram</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.5 9.5L9.5 2.5" />
              <path d="M4 2.5H9.5V8" />
            </svg>
          </button>
        </div>
      </section>

      {/* Mapping Dialog Modal */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mapping-modal-title"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto"
          data-lenis-prevent
        >
          {/* Dark blur backdrop */}
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity cursor-pointer"
            aria-hidden="true"
          />

          {/* Modal card */}
          <div
            ref={modalRef}
            className="relative z-10 w-full max-w-5xl rounded-xl border border-ivory/25 bg-[#121415] shadow-2xl shadow-black/95 p-5 sm:p-6 md:p-8 flex flex-col max-h-[88vh] overflow-y-auto data-tracks-scroll my-auto"
            data-lenis-prevent
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-ivory/10 pb-4">
              <div>
                <span className="font-stencil text-[10px] uppercase tracking-[0.24em] text-ember font-medium">
                  Live Sonification Architecture
                </span>
                <h2
                  id="mapping-modal-title"
                  className="mt-0.5 font-meno text-2xl sm:text-3xl font-light text-ivory tracking-tight"
                  style={{ fontFamily: '"Meno Banner", Georgia, serif' }}
                >
                  How {variable.name.toLowerCase()} becomes sound
                </h2>
                <p className="mt-1 text-[13px] text-cream font-ui leading-relaxed">
                  {scoreMode
                    ? 'Project score · one key and scale for the whole walk'
                    : layerCount > 1
                      ? `${layerCount} layers active · this diagram describes the lead track (${variable.name})`
                      : 'Live mapping · the audio engine and this diagram share one deterministic function'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded border border-ivory/20 text-ivory/70 hover:border-ivory/60 hover:text-white hover:bg-ivory/10 transition-colors cursor-pointer text-sm shrink-0 ml-4"
                title="Close popup"
                aria-label="Close popup"
              >
                ✕
              </button>
            </div>

            {/* 4-Step Mapping Grid */}
            <div className="mt-5 grid divide-y divide-ivory/10 md:grid-cols-4 md:divide-x md:divide-y-0">
              {/* 1 — measurement */}
              <div className="pb-4 md:pb-0 md:pr-4">
                <p className="flex items-baseline gap-2 font-ui text-[14px] text-cream">
                  <span className="font-data text-[12px] text-beige">01</span>
                  Measured
                </p>
                <p className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-data text-[20px] leading-none text-ivory font-semibold">
                    {value !== null ? fmtValue(value, variable.decimals) : '—'}
                  </span>
                  <span className="font-ui text-[14px] text-cream">{variable.unit}</span>
                </p>
                <div className="relative mt-3 h-2 w-full bg-white/[0.07]">
                  {norm !== null && (
                    <span
                      className="absolute -top-1 h-4 w-1 bg-ember"
                      style={{ left: `${Math.max(0, Math.min(100, norm * 100))}%` }}
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="mt-1.5 flex justify-between font-data text-[12px] text-beige">
                  <span>{fmtValue(range.lo, variable.decimals)}</span>
                  <span>{fmtValue(range.hi, variable.decimals)}</span>
                </div>
                <p className="mt-2 font-ui text-[13px] leading-snug text-cream">Observed range of the loaded record.</p>
              </div>

              {/* 2 — normalise */}
              <div className="py-4 md:px-4 md:py-0">
                <p className="flex items-baseline gap-2 font-ui text-[14px] text-cream">
                  <span className="font-data text-[12px] text-beige">02</span>
                  Normalised
                </p>
                <p className="mt-2 font-data text-[20px] leading-none text-ivory font-semibold">
                  {norm !== null ? norm.toFixed(2) : '—'}
                </p>
                <div className="mt-3 h-2 w-full bg-white/[0.07]">
                  <div
                    className="h-2 bg-cream/70"
                    style={{ width: `${norm === null ? 0 : Math.max(0, Math.min(100, norm * 100))}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between font-data text-[12px] text-beige">
                  <span>0.00</span>
                  <span>1.00</span>
                </div>
                <p className="mt-2 font-ui text-[13px] leading-snug text-cream">
                  Linear position inside the record — not a rank or a probability.
                </p>
              </div>

              {/* 3 — pitch + mode */}
              <div className="py-4 md:px-4 md:py-0">
                <p className="flex items-baseline gap-2 font-ui text-[14px] text-cream">
                  <span className="font-data text-[12px] text-beige">03</span>
                  Pitch &amp; scale
                </p>
                <p className="mt-2 flex items-baseline gap-2">
                  <span className="font-data text-[20px] leading-none text-ivory font-semibold">{plan.note || 'rest'}</span>
                  <span className="font-ui text-[13px] text-cream">{scoreMode || plan.mode}</span>
                </p>
                {scoreMode ? (
                  <p className="mt-3 border border-ivory/15 px-2 py-1.5 font-ui text-[13px] leading-snug text-cream">
                    Score mode: <span className="text-ivory">{scoreMode}</span>
                    {scoreTempo ? ` · ${scoreTempo} bpm` : ''} — one colour for the whole walk.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-1" role="img" aria-label={`${plan.mode} scale; active note ${plan.note || 'none'}`}>
                    {scaleNotes.map((midi) => {
                      const active = plan.midi === midi || plan.midi === midi + 12 || plan.midi === midi - 12
                      return (
                        <span
                          key={midi}
                          className={`inline-flex min-w-[34px] items-center justify-center border px-1 py-1 font-data text-[12px] ${
                            active ? 'border-ember bg-ember/20 text-ivory' : 'border-ivory/15 text-beige'
                          }`}
                          title={midiToName(midi)}
                        >
                          {midiToName(midi)}
                        </span>
                      )
                    })}
                  </div>
                )}
                <p className="mt-2 font-ui text-[13px] leading-snug text-cream">{rule}</p>
              </div>

              {/* 4 — layers */}
              <div className="pt-4 md:pl-4 md:pt-0">
                <p className="flex items-baseline gap-2 font-ui text-[14px] text-cream">
                  <span className="font-data text-[12px] text-beige">04</span>
                  Layers
                </p>
                <ul className="mt-2 space-y-2">
                  {layers.map((layer) => (
                    <li key={layer.id}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-ui text-[13px] text-ivory">{layer.label}</span>
                        <span className="font-data text-[12px] text-beige">{layer.detail}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full bg-white/[0.07]">
                        <div className="h-1.5 bg-ember/80" style={{ width: `${Math.round(layer.level * 100)}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Mode & cadence narrative */}
            {plan.missing ? (
              <p className="mt-5 border-t border-ivory/10 pt-3.5 font-ui text-[14px] leading-relaxed text-cream">
                No valid observation for this month. The mix adds no new note for this layer; the pad
                keeps its chord and nothing is invented.
              </p>
            ) : scoreMode ? (
              <p className="mt-5 border-t border-ivory/10 pt-3.5 font-ui text-[14px] leading-relaxed text-cream">
                Score tempo {scoreTempo ?? '—'} bpm — one month is {score.beatsPerStep || 2} beats, and
                the project score keeps one key and scale for the whole selection.
                {layerCount > 1
                  ? ` ${selectedLayers.map((v) => v.name).join(', ')} are scored together; ${variable.name} leads.`
                  : ''}
                {' '}A month with no valid value has no note in the score.
              </p>
            ) : (
              <p className="mt-5 border-t border-ivory/10 pt-3.5 font-ui text-[14px] leading-relaxed text-cream">
                {plan.density > 1 && variable.id === 'PRECTOTCORR'
                  ? `Rain density: ${plan.density} notes across the month. `
                  : ''}
                Tempo {plan.tempo} bpm — one month is two beats, and two months make one bar.
                {layerCount > 1
                  ? ` ${selectedLayers.map((v) => v.name).join(', ')} sound together; ${variable.name} leads and sets the tempo.`
                  : ''}
                {' '}A month with no valid value adds no note to any layer.
              </p>
            )}

            {/* Technical notes disclosure */}
            <details className="mt-4 border-t border-ivory/10 pt-2">
              <summary className="cursor-pointer py-2 font-ui text-[14.5px] font-medium text-ivory hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory">
                Technical notes — full mapping specifications and data handling
              </summary>
              <div className="grid gap-3 pt-3 md:grid-cols-2">
                <Note title="Input">{m.input}</Note>
                <Note title="Normalise">{m.normalize}</Note>
                <Note title="Audio parameter">{m.parameter}. {m.direction}</Note>
                <Note title="Missing data">{m.missing}</Note>
                <Note title="Layers">
                  {m.layers.map(([name, desc]) => `${name}: ${desc}`).join(' · ')}
                </Note>
                <Note title="Scale rule">
                  {rule} Pitch sits inside a two-octave scale from the variable's root; the chord is built from scale degrees 1, 3 and 5 and holds until the mode changes.
                </Note>
              </div>
            </details>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function Note({ title, children }) {
  return (
    <div>
      <p className="font-ui text-[14px] text-cream">{title}</p>
      <p className="mt-1 font-ui text-[14px] leading-relaxed text-ivory">{children}</p>
    </div>
  )
}

export default memo(MappingPanel)
