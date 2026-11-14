/**
 * One-sentence "gist" of the current selection, plus a short motif.
 *
 * The sonification literature reviewed for this project converges on a
 * summary-first flow: give an overview before the details, so a listener
 * knows the range and the anomaly before walking month by month (the
 * "overview first, zoom and filter, then details-on-demand" pattern, and the
 * 10–20 s gist used in interactive sonification trials).
 *
 * Everything here is computed from the validated series. The sentence is
 * announced through the one polite live region (so a screen reader hears it)
 * and also played as a ~6 s motif: home note, mean, minimum, maximum, mean,
 * home. No value is invented; a selection without valid months returns a
 * summary with no notes.
 */

import { baselineNormal, extent, keyToLabel, monthlyArray, monthsInSelection } from './processing'
import { fmtValue } from './format'
import { scaleFor, quantize, voiceFor } from './music'
import { selectionSummary } from './selectors'
import { BASELINE, YEAR_MIN, YEAR_MAX } from '../data/datasets'

function scopePhrase(scopeName, scopeKind) {
  return scopeKind === 'national'
    ? 'the planetary mean of seven continental samples'
    : `the measured continental sample at ${scopeName}`
}

function comparisonPhrase(summary, variable) {
  if (summary.normal === null || summary.delta === null) {
    return `no ${BASELINE.start}–${BASELINE.end} normal is available at this scope, so no comparison is made`
  }
  const unit = variable.unit
  const decimals = variable.decimals
  const step = variable.mapping && variable.mapping.noticeable ? variable.mapping.noticeable : 0.3
  const relative = variable.id === 'PRECTOTCORR'
    ? summary.normal > 0.05 ? summary.delta / summary.normal : 0
    : summary.delta / step
  if (Math.abs(relative) < 0.55) {
    return `close to the ${BASELINE.start}–${BASELINE.end} normal of ${fmtValue(summary.normal, decimals)} ${unit}`
  }
  return `${fmtValue(Math.abs(summary.delta), decimals)} ${unit} ${summary.delta > 0 ? 'above' : 'below'} the ${BASELINE.start}–${BASELINE.end} normal of ${fmtValue(summary.normal, decimals)} ${unit}`
}

function annualMean(seriesMap, year) {
  let sum = 0
  let n = 0
  for (let m = 1; m <= 12; m += 1) {
    const key = `${year}${String(m).padStart(2, '0')}`
    const v = seriesMap && Object.prototype.hasOwnProperty.call(seriesMap, key) ? seriesMap[key] : null
    if (typeof v === 'number') {
      sum += v
      n += 1
    }
  }
  return n >= 6 ? sum / n : null
}

function meanNormal(seriesMap, points) {
  const normals = baselineNormal(seriesMap, BASELINE)
  let sum = 0
  let n = 0
  let valid = 0
  for (const point of points) {
    if (typeof point.value !== 'number') continue
    valid += 1
    const month = Number(point.key.slice(4, 6))
    const normal = normals[month]
    if (normal !== null && normal !== undefined) {
      sum += normal
      n += 1
    }
  }
  if (!n || n < valid * 0.75) return null
  return sum / n
}

function trendPhrase(seriesMap, state, variable) {
  if (state.timeMode !== 'range' || state.range.startYear === state.range.endYear) return ''
  const first = annualMean(seriesMap, state.range.startYear)
  const last = annualMean(seriesMap, state.range.endYear)
  if (first === null || last === null) return ''
  const delta = last - first
  if (Math.abs(delta) < 0.05) {
    return ` The annual mean was essentially unchanged between ${state.range.startYear} and ${state.range.endYear}.`
  }
  return ` The annual mean ${delta > 0 ? 'rose' : 'fell'} by ${fmtValue(Math.abs(delta), variable.decimals)} ${variable.unit} between ${state.range.startYear} and ${state.range.endYear}.`
}

function buildNotes({ variable, seriesMap, summary }) {
  if (summary.selMean === null || summary.selMean === undefined) return []
  const record = extent(monthlyArray(seriesMap, YEAR_MIN, YEAR_MAX))
  const lo = record[0] === null ? summary.selMin : record[0]
  const hi = record[1] === null ? summary.selMax : record[1]
  const norm = (v) => {
    if (v === null || v === undefined) return 0.5
    if (!(hi > lo)) return 0.5
    return Math.max(0, Math.min(1, (v - lo) / (hi - lo)))
  }
  const voice = voiceFor(variable)
  const scaleId = scaleFor(variable, 0)
  const root = voice.rootMidi + 12
  const home = quantize(0.5, scaleId, root, 2)
  const mean = quantize(norm(summary.selMean), scaleId, root, 2)
  const min = quantize(norm(summary.selMin), scaleId, root, 2)
  const max = quantize(norm(summary.selMax), scaleId, root, 2)
  const rack = voice.rack

  /* A single valid period has no range to tour: home, it, home. */
  if (summary.selMin === summary.selMax) {
    return [
      { midi: home, at: 0, length: 0.6, gain: 0.12, rack },
      { midi: mean, at: 0.7, length: 0.9, gain: 0.22, rack },
      { midi: home, at: 1.9, length: 1.4, gain: 0.12, rack },
    ]
  }

  return [
    { midi: home, at: 0, length: 0.6, gain: 0.12, rack },
    { midi: mean, at: 0.55, length: 0.7, gain: 0.2, rack },
    { midi: min, at: 1.5, length: 0.6, gain: 0.16, rack },
    { midi: max, at: 2.35, length: 0.6, gain: 0.18, rack },
    { midi: mean, at: 3.2, length: 0.8, gain: 0.2, rack },
    { midi: home, at: 4.2, length: 1.6, gain: 0.12, rack },
  ]
}

/**
 * @param {object} args
 * @param {object} args.state          Preview state (timeMode, year, month, range, scope)
 * @param {object} args.variable       variable registry entry
 * @param {object} args.seriesMap      { YYYYMM: number|null } for the current scope
 * @param {Array}  args.steps          current step list (used by range summaries)
 * @param {string} args.scopeName
 * @param {string} args.scopeKind      'national' | 'division'
 */
export function buildSelectionSummary({ state, variable, seriesMap, steps = [], scopeName, scopeKind }) {
  const summary = selectionSummary({
    state,
    variable,
    seriesMap,
    steps,
    position: state.position || 0,
    playState: state.playState || 'idle',
  })

  const keys = monthsInSelection(state.timeMode, state, YEAR_MIN, YEAR_MAX)
  const points = keys.map((key) => ({
    key,
    value: seriesMap && Object.prototype.hasOwnProperty.call(seriesMap, key) ? seriesMap[key] : null,
  }))
  const valid = points.filter((p) => typeof p.value === 'number')
  const minPoint = valid.reduce((best, p) => (!best || p.value < best.value ? p : best), null)
  const maxPoint = valid.reduce((best, p) => (!best || p.value > best.value ? p : best), null)

  /* Compare the selection mean with the normals for the same calendar months,
     never with a single month's normal. */
  const normal = meanNormal(seriesMap, points)
  const delta = normal !== null && summary.selMean !== null ? summary.selMean - normal : null
  const comparison = { normal, delta }

  const scope = scopePhrase(scopeName, scopeKind)
  const unit = variable.unit
  const decimals = variable.decimals
  const label = summary.selectionLabel

  if (summary.selMean === null || valid.length === 0) {
    return {
      label,
      min: null,
      max: null,
      mean: null,
      normal: null,
      delta: null,
      coverage: 0,
      text: `${label} at ${scope}. No valid ${variable.name.toLowerCase()} observations were returned for this selection, so no summary can be played and no value is invented.`,
      shortText: `${label} · no valid observations`,
      notes: [],
    }
  }

  let period
  if (state.timeMode === 'range') period = `${state.range.startYear} to ${state.range.endYear}`
  else if (state.timeMode === 'month') period = keyToLabel(`${state.year}${String(state.month).padStart(2, '0')}`)
  else period = `${state.year}`

  const coverageNote = valid.length < points.length
    ? ` ${valid.length} of ${points.length} months had a valid value.`
    : ''

  const text = `${period}, ${variable.name.toLowerCase()} at ${scope} ranged from ${fmtValue(minPoint.value, decimals)} ${unit} in ${keyToLabel(minPoint.key)} to ${fmtValue(maxPoint.value, decimals)} ${unit} in ${keyToLabel(maxPoint.key)}, averaging ${fmtValue(summary.selMean, decimals)} ${unit}, ${comparisonPhrase(comparison, variable)}.${trendPhrase(seriesMap, state, variable)}${coverageNote} This is a summary, not a recorded sound: play next for the month-by-month walk.`

  return {
    label,
    min: minPoint.value,
    max: maxPoint.value,
    mean: summary.selMean,
    normal,
    delta,
    coverage: points.length ? valid.length / points.length : 0,
    text,
    shortText: `${label} · ${fmtValue(minPoint.value, decimals)}–${fmtValue(maxPoint.value, decimals)} ${unit} · mean ${fmtValue(summary.selMean, decimals)} ${unit}`,
    notes: buildNotes({ variable, seriesMap, summary }),
  }
}
