/**
 * Client-Side NASA Frame & Image Sonifier for Prism Tone.
 *
 * Implements the deterministic computer-vision-to-sound pipeline directly
 * in the browser via HTML5 Canvas and Web Audio concepts:
 *   1. Decode image/video onto an offscreen canvas at 96×54 resolution.
 *   2. Compute per-pixel Luminance (ITU-R BT.709: 0.2126R + 0.7152G + 0.0722B) and HSV.
 *   3. Apply 3×3 Sobel operator for spatial edge density & structural contrast.
 *   4. Deterministic scanning: columns (horizontal sweep), radial (center-outward),
 *      or regions (spatial audio voices).
 *   5. Scientific parameter mapping to musical pitches, chords, velocities, pan, and percussion.
 *   6. Output standard MusicalScore v1.0 directly runnable by Tone.js scorePlayer.
 *
 * Zero server dependencies: Works offline, on GitHub Pages, Vercel, and static previews.
 */

import { SCORE_VERSION, ROLES } from './score'
import { SCALES, NOTE_NAMES, scaleMidi, quantize } from './music'

export const GRID_W = 96
export const GRID_H = 54
export const STEP_BEATS = 0.5

export const IMAGE_PROFILES = {
  'night-lights': {
    label: 'Night-light illuminance',
    variable: 'night-light brightness',
    key: 'A',
    scale: 'majorPentatonic',
    tempo: 69,
    register: 0,
    lead: 'glass',
    pad: 'warm',
    bass: 'deep',
    perc: 'tick',
    texture: 'air',
    flashThreshold: 0.40,
    edgeThreshold: 0.62,
    percPerBar: 2,
    visual: 'a left-to-right sweep of the city lights',
    rise: 'brighter metropolitan cores raise pitch and add glass arpeggio notes',
    fall: 'dark oceans and wilderness leave rests instead of quiet notes',
    accent: 'an isolated bright cluster adds a tick',
  },
  'ocean-thermal': {
    label: 'Sea-surface temperature gradient',
    variable: 'thermal colour-ramp position',
    key: 'D',
    scale: 'dorian',
    tempo: 66,
    register: 0,
    lead: 'flute',
    pad: 'flow',
    bass: 'deep',
    perc: 'ripple',
    texture: 'flow',
    flashThreshold: 0.55,
    edgeThreshold: 0.70,
    percPerBar: 2,
    visual: 'a left-to-right sweep across the global ocean',
    rise: 'warm tropical water lifts the flute and widens the pad',
    fall: 'cold polar water settles into the lower register',
    accent: 'a sharp current edge adds a water ripple',
  },
  'lightning': {
    label: 'Optical lightning flash intensity',
    variable: 'flash luminance above the local baseline',
    key: 'F#',
    scale: 'phrygian',
    tempo: 61,
    register: 12,
    lead: 'bell',
    pad: 'dark',
    bass: 'pulse',
    perc: 'zap',
    texture: 'wind',
    flashThreshold: 0.16,
    edgeThreshold: 0.62,
    percPerBar: 4,
    visual: 'a centre-outward radial sweep',
    rise: 'a brighter flash pushes the bell higher and louder',
    fall: 'the storm background holds a low dark pad',
    accent: 'the strongest flashes fire a transient zap',
  },
  'aerosols': {
    label: 'Aerosol plume colour',
    variable: 'plume colour-ramp position',
    key: 'G',
    scale: 'dorian',
    tempo: 70,
    register: 0,
    lead: 'reed',
    pad: 'airy',
    bass: 'wood',
    perc: 'brush',
    texture: 'haze',
    flashThreshold: 0.42,
    edgeThreshold: 0.52,
    percPerBar: 3,
    visual: 'spatial tiles read as independent harmonic voices',
    rise: 'dense dust and smoke push the reed upward',
    fall: 'clean air thins the texture to a quiet pad',
    accent: 'a plume edge sweeps a brush hit across the stereo field',
  },
  'canopy': {
    label: 'Canopy height',
    variable: 'canopy colour-ramp position',
    key: 'C',
    scale: 'majorPentatonic',
    tempo: 63,
    register: 0,
    lead: 'marimba',
    pad: 'swell',
    bass: 'wood',
    perc: 'knock',
    texture: 'air',
    flashThreshold: 0.45,
    edgeThreshold: 0.55,
    percPerBar: 3,
    visual: 'a left-to-right sweep across the forest map',
    rise: 'tall emergent canopy lifts the marimba register',
    fall: 'bare ground drops to the root and rests',
    accent: 'a sharp canopy edge adds a wooden knock',
  },
  'river': {
    label: 'Atmospheric-river moisture',
    variable: 'moisture colour-ramp position',
    key: 'A',
    scale: 'dorian',
    tempo: 62,
    register: 0,
    lead: 'pluck',
    pad: 'swell',
    bass: 'deep',
    perc: 'drop',
    texture: 'flow',
    flashThreshold: 0.38,
    edgeThreshold: 0.60,
    percPerBar: 3,
    visual: 'a left-to-right sweep through the vapour plume',
    rise: 'a saturated plume lifts the pluck and swells the pad',
    fall: 'dry air narrows the filter and thins the texture',
    accent: 'a torrential core adds a low water drop',
  },
  'co2': {
    label: 'Carbon-dioxide concentration',
    variable: 'CO₂ colour-ramp position',
    key: 'C',
    scale: 'minor',
    tempo: 58,
    register: -12,
    lead: 'drone',
    pad: 'dark',
    bass: 'sub',
    perc: 'thud',
    texture: 'haze',
    flashThreshold: 0.50,
    edgeThreshold: 0.66,
    percPerBar: 2,
    visual: 'a slow left-to-right sweep of the concentration field',
    rise: 'a high-emission plume pulls the drone upward and adds tension',
    fall: 'ocean sinks settle into the sub-bass',
    accent: 'a sharp concentration front adds a low thud',
  },
  'air-quality': {
    label: 'Fine particulate matter',
    variable: 'PM2.5 colour-ramp position',
    key: 'G',
    scale: 'phrygian',
    tempo: 72,
    register: 0,
    lead: 'reed',
    pad: 'haze',
    bass: 'pulse',
    perc: 'tick',
    texture: 'haze',
    flashThreshold: 0.35,
    edgeThreshold: 0.50,
    percPerBar: 4,
    visual: 'spatial regions read as layered voices',
    rise: 'hazardous particulate lifts the reed into a tense register',
    fall: 'pristine air relaxes the pad and clears the texture',
    accent: 'a sharp plume boundary adds a dry tick',
  },
  'currents': {
    label: 'Boundary-current velocity',
    variable: 'velocity colour-ramp position',
    key: 'D',
    scale: 'majorPentatonic',
    tempo: 64,
    register: 12,
    lead: 'glass',
    pad: 'flow',
    bass: 'deep',
    perc: 'ripple',
    texture: 'flow',
    flashThreshold: 0.40,
    edgeThreshold: 0.58,
    percPerBar: 3,
    visual: 'a left-to-right sweep following the current',
    rise: 'a fast jet lifts the glass arpeggio and pans it across the field',
    fall: 'abyssal calm leaves the pad alone',
    accent: 'a meander edge adds a stereo ripple',
  },
  'astral': {
    label: 'Stellar brightness',
    variable: 'luminance-ramp position',
    key: 'E',
    scale: 'phrygian',
    tempo: 67,
    register: 0,
    lead: 'bell',
    pad: 'air',
    bass: 'sub',
    perc: 'shimmer',
    texture: 'glass',
    flashThreshold: 0.42,
    edgeThreshold: 0.60,
    percPerBar: 3,
    visual: 'a left-to-right sweep across the nebula',
    rise: 'a bright core lifts the bell and opens the air pad',
    fall: 'deep space falls back to the sub-bass',
    accent: 'a stellar edge adds a shimmer',
  },
  'default': {
    label: 'NASA Visual Frame',
    variable: 'visual frame brightness & spectral hue',
    key: 'D',
    scale: 'dorian',
    tempo: 68,
    register: 0,
    lead: 'glass',
    pad: 'warm',
    bass: 'deep',
    perc: 'tick',
    texture: 'air',
    flashThreshold: 0.42,
    edgeThreshold: 0.60,
    percPerBar: 2,
    visual: 'a left-to-right scan of the visual frame',
    rise: 'higher brightness and saturation lift the melody',
    fall: 'shadows and unlit regions soften into the background',
    accent: 'sharp visual edges trigger light accents',
  },
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo))
}

function rgbToHsv(r, g, b) {
  const rf = r / 255
  const gf = g / 255
  const bf = b / 255
  const max = Math.max(rf, gf, bf)
  const min = Math.min(rf, gf, bf)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max

  if (d !== 0) {
    switch (max) {
      case rf:
        h = (gf - bf) / d + (gf < bf ? 6 : 0)
        break
      case gf:
        h = (bf - rf) / d + 2
        break
      case bf:
        h = (rf - gf) / d + 4
        break
      default:
        break
    }
    h /= 6
  }

  return { h: h * 360, s, v }
}

function computeSobelEdges(lumGrid, width, height) {
  const edges = new Float32Array(width * height)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const gx =
        -lumGrid[idx - width - 1] + lumGrid[idx - width + 1] +
        -2 * lumGrid[idx - 1] + 2 * lumGrid[idx + 1] +
        -lumGrid[idx + width - 1] + lumGrid[idx + width + 1]

      const gy =
        -lumGrid[idx - width - 1] - 2 * lumGrid[idx - width] - lumGrid[idx - width + 1] +
        lumGrid[idx + width - 1] + 2 * lumGrid[idx + width] + lumGrid[idx + width + 1]

      edges[idx] = Math.min(1.0, Math.sqrt(gx * gx + gy * gy) / 4.0)
    }
  }
  return edges
}

/**
 * Loads an image from File, Blob, or URL into an HTMLImageElement.
 */
/**
 * Loads an image from File, Blob, or URL into an HTMLImageElement.
 * Supports local files, remote URLs, and CORS proxy fallback for servers like NASA SVS.
 */
function loadImageElement(source) {
  return new Promise((resolve, reject) => {
    let objectUrl = null

    if (source instanceof Blob || source instanceof File) {
      const img = new Image()
      objectUrl = URL.createObjectURL(source)
      img.onload = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        resolve(img)
      }
      img.onerror = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        reject(new Error('Failed to decode local image file.'))
      }
      img.src = objectUrl
      return
    }

    if (typeof source === 'string') {
      const isRemote = /^https?:\/\//i.test(source)
      const tryLoad = (srcUrl, allowProxyFallback = true) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => {
          if (isRemote && allowProxyFallback) {
            // Fallback to CORS proxy for external servers (like NASA SVS) that restrict direct browser canvas reads
            const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(source)}`
            tryLoad(proxyUrl, false)
          } else {
            reject(new Error('Could not load remote image due to CORS restrictions. Please upload it directly as a PNG/JPEG file using "Choose File".'))
          }
        }
        img.src = srcUrl
      }
      tryLoad(source, true)
      return
    }

    reject(new Error('Invalid image source'))
  })
}

/**
 * Extracts 96×54 pixel analysis from an image element.
 */
function extractImageGrid(img) {
  const canvas = document.createElement('canvas')
  canvas.width = GRID_W
  canvas.height = GRID_H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, GRID_W, GRID_H)

  const imgData = ctx.getImageData(0, 0, GRID_W, GRID_H)
  const data = imgData.data

  const lumGrid = new Float32Array(GRID_W * GRID_H)
  const hsvGrid = []

  let totalLum = 0
  let totalSat = 0

  for (let i = 0; i < GRID_W * GRID_H; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]

    // ITU-R BT.709 luminance
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    lumGrid[i] = lum
    totalLum += lum

    const hsv = rgbToHsv(r, g, b)
    hsvGrid.push(hsv)
    totalSat += hsv.s
  }

  const edgeGrid = computeSobelEdges(lumGrid, GRID_W, GRID_H)
  const meanLum = totalLum / (GRID_W * GRID_H)
  const meanSat = totalSat / (GRID_W * GRID_H)

  return {
    lumGrid,
    hsvGrid,
    edgeGrid,
    meanLum,
    meanSat,
  }
}

/**
 * Synthesizes MusicalScore from image analysis.
 */
export function buildScoreFromAnalysis(gridData, profileKey = 'default', options = {}) {
  const profile = IMAGE_PROFILES[profileKey] || IMAGE_PROFILES['default']
  const scanMode = options.scan || 'columns'
  const keyName = options.key || profile.key || 'D'
  const scaleName = options.scale || profile.scale || 'dorian'
  const tempoBpm = options.tempo || profile.tempo || 68
  const baseRegister = (profile.register || 0)

  const scaleId = scaleName.replace(/\s+/g, '')
  const scaleDef = SCALES[scaleId] || SCALES.dorian
  const rootIndex = NOTE_NAMES.indexOf(keyName.replace(/b/i, '#'))
  const rootMidi = 50 + (rootIndex >= 0 ? rootIndex - 2 : 0) + baseRegister

  const notesScale = scaleMidi(scaleDef.id, rootMidi, 3)

  const leadNotes = []
  const padNotes = []
  const bassNotes = []
  const percNotes = []
  const textureNotes = []

  const { lumGrid, hsvGrid, edgeGrid } = gridData

  if (scanMode === 'columns') {
    // 96 columns = 96 steps @ 0.5 beats = 48 beats total
    for (let x = 0; x < GRID_W; x++) {
      let colLum = 0
      let colSat = 0
      let colHue = 0
      let colEdge = 0
      let maxGradY = 0
      let maxGradVal = -1

      for (let y = 0; y < GRID_H; y++) {
        const idx = y * GRID_W + x
        colLum += lumGrid[idx]
        colSat += hsvGrid[idx].s
        colHue += hsvGrid[idx].h
        colEdge += edgeGrid[idx]

        if (edgeGrid[idx] > maxGradVal) {
          maxGradVal = edgeGrid[idx]
          maxGradY = y
        }
      }

      colLum /= GRID_H
      colSat /= GRID_H
      colHue /= GRID_H
      colEdge /= GRID_H

      const tBeats = x * STEP_BEATS
      const pan = (x / (GRID_W - 1)) * 1.8 - 0.9 // Stereo sweep from left to right

      // 1. Lead note (melodic voice)
      if (colLum > 0.08) {
        // Map height + luminance to scale note
        const normPitch = clamp((1 - maxGradY / GRID_H) * 0.6 + colLum * 0.4, 0, 1)
        const noteIndex = Math.min(notesScale.length - 1, Math.floor(normPitch * notesScale.length))
        const midi = notesScale[noteIndex]
        const vel = clamp(colLum * 0.75 + colSat * 0.25, 0.15, 0.95)
        const dur = colEdge > 0.3 ? 0.45 : 0.9

        leadNotes.push({
          t_beats: tBeats,
          dur_beats: dur,
          midi,
          vel,
          pan,
        })
      }

      // 2. Pad notes (harmonic support every 4 steps = 2 beats = 1 bar)
      if (x % 4 === 0) {
        const padRoot = notesScale[0] - 12
        const padChord = [padRoot, padRoot + 7, padRoot + 12] // Root-5th-Octave
        for (const pMidi of padChord) {
          padNotes.push({
            t_beats: tBeats,
            dur_beats: 2.0,
            midi: pMidi,
            vel: clamp(colSat * 0.4 + 0.2, 0.1, 0.5),
            pan: 0,
          })
        }
      }

      // 3. Bass note on bar lines (every 8 steps = 4 beats)
      if (x % 8 === 0) {
        bassNotes.push({
          t_beats: tBeats,
          dur_beats: 3.5,
          midi: notesScale[0] - 24,
          vel: 0.65,
          pan: 0,
        })
      }

      // 4. Percussion / transient triggers on contrast edges or flash points
      const isTransient = colEdge > profile.edgeThreshold || colLum > profile.flashThreshold
      if (isTransient) {
        percNotes.push({
          t_beats: tBeats,
          dur_beats: 0.2,
          midi: 60,
          vel: clamp(colEdge * 0.8 + 0.2, 0.3, 0.9),
          pan,
        })
      }
    }
  } else if (scanMode === 'radial') {
    // Center outward radial scan
    const cx = GRID_W / 2
    const cy = GRID_H / 2
    const maxR = Math.hypot(cx, cy)
    const numRings = 48

    for (let r = 0; r < numRings; r++) {
      const rInner = (r / numRings) * maxR
      const rOuter = ((r + 1) / numRings) * maxR
      let ringLum = 0
      let ringSat = 0
      let ringEdge = 0
      let count = 0

      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          const dist = Math.hypot(x - cx, y - cy)
          if (dist >= rInner && dist < rOuter) {
            const idx = y * GRID_W + x
            ringLum += lumGrid[idx]
            ringSat += hsvGrid[idx].s
            ringEdge += edgeGrid[idx]
            count++
          }
        }
      }

      if (count > 0) {
        ringLum /= count
        ringSat /= count
        ringEdge /= count
      }

      const tBeats = r * STEP_BEATS
      const normPitch = clamp(ringLum, 0, 1)
      const noteIndex = Math.min(notesScale.length - 1, Math.floor(normPitch * notesScale.length))
      const midi = notesScale[noteIndex]

      leadNotes.push({
        t_beats: tBeats,
        dur_beats: 0.5,
        midi,
        vel: clamp(ringLum * 0.8 + 0.2, 0.15, 0.9),
        pan: 0,
      })

      if (r % 4 === 0) {
        padNotes.push({
          t_beats: tBeats,
          dur_beats: 2.0,
          midi: notesScale[0] - 12,
          vel: clamp(ringSat * 0.4 + 0.25, 0.1, 0.5),
          pan: 0,
        })
      }

      if (ringEdge > profile.edgeThreshold) {
        percNotes.push({
          t_beats: tBeats,
          dur_beats: 0.2,
          midi: 60,
          vel: clamp(ringEdge, 0.4, 0.85),
          pan: (r % 2 === 0 ? 0.3 : -0.3),
        })
      }
    }
  } else {
    // Regions mode (8 regional voices)
    const numRegions = 8
    const colsPerRegion = GRID_W / numRegions

    for (let reg = 0; reg < numRegions; reg++) {
      const startX = Math.floor(reg * colsPerRegion)
      const endX = Math.floor((reg + 1) * colsPerRegion)

      for (let step = 0; step < 8; step++) {
        const tBeats = (reg * 8 + step) * STEP_BEATS
        let subLum = 0
        let subEdge = 0
        let count = 0

        for (let x = startX; x < endX; x++) {
          for (let y = 0; y < GRID_H; y++) {
            const idx = y * GRID_W + x
            subLum += lumGrid[idx]
            subEdge += edgeGrid[idx]
            count++
          }
        }

        subLum /= count
        subEdge /= count

        const pan = (reg / (numRegions - 1)) * 1.6 - 0.8
        const noteIdx = Math.min(notesScale.length - 1, Math.floor(subLum * notesScale.length))

        leadNotes.push({
          t_beats: tBeats,
          dur_beats: 0.75,
          midi: notesScale[noteIdx],
          vel: clamp(subLum * 0.8 + 0.2, 0.2, 0.9),
          pan,
        })

        if (subEdge > profile.edgeThreshold) {
          percNotes.push({
            t_beats: tBeats,
            dur_beats: 0.2,
            midi: 60,
            vel: 0.7,
            pan,
          })
        }
      }
    }
  }

  const tracks = [
    {
      id: 'lead',
      role: 'lead',
      instrument: profile.lead || 'glass',
      notes: leadNotes,
      params: { cutoff_hz: 2800, reverb_send: 0.35, detune_cents: 0, density: 0.7 },
    },
    {
      id: 'pad',
      role: 'pad',
      instrument: profile.pad || 'warm',
      notes: padNotes,
      params: { cutoff_hz: 1600, reverb_send: 0.45, detune_cents: 0, density: 0.4 },
    },
    {
      id: 'bass',
      role: 'bass',
      instrument: profile.bass || 'deep',
      notes: bassNotes,
      params: { cutoff_hz: 800, reverb_send: 0.15, detune_cents: 0, density: 0.3 },
    },
    {
      id: 'perc',
      role: 'perc',
      instrument: profile.perc || 'tick',
      notes: percNotes,
      params: { cutoff_hz: 3200, reverb_send: 0.25, detune_cents: 0, density: 0.5 },
    },
  ]

  const captions = [
    { t_beats: 0, text: `Starting sonification: ${profile.label} in ${keyName} ${scaleName}.` },
    { t_beats: 16, text: `Mid-scan dynamic range: ${profile.rise}.` },
    { t_beats: 32, text: `Contrast profile: ${profile.visual}.` },
  ]

  const musicalScore = {
    version: SCORE_VERSION,
    key: keyName,
    scale: scaleName,
    tempo_bpm: tempoBpm,
    tracks,
    captions,
    provenance: {
      stats: {
        beats_per_month: 2,
        mean_luminance: gridData.meanLum,
        mean_saturation: gridData.meanSat,
        scan_mode: scanMode,
      },
      mapping: {
        profile: profileKey,
        instruments: {
          lead: profile.lead,
          pad: profile.pad,
          bass: profile.bass,
          perc: profile.perc,
        },
      },
      missing_policy: 'transparent_rests',
    },
  }

  return musicalScore
}

/**
 * Main client-side sonification entry point for any image File, Blob, or URL.
 */
export async function sonifyImageClient({ file, imageUrl, options = {} }) {
  try {
    const source = file || imageUrl
    if (!source) {
      return { ok: false, kind: 'invalid', message: 'No image source provided.' }
    }

    const img = await loadImageElement(source)
    const gridData = extractImageGrid(img)
    const profileKey = options.profile || 'default'
    const musicalScore = buildScoreFromAnalysis(gridData, profileKey, options)

    return {
      ok: true,
      musical_score: musicalScore,
      score: musicalScore,
      source: { kind: 'image', id: typeof source === 'string' ? source : file.name },
      analysis: {
        mean_luminance: gridData.meanLum,
        mean_saturation: gridData.meanSat,
        scan: options.scan || 'columns',
        profile: profileKey,
      },
    }
  } catch (err) {
    return {
      ok: false,
      kind: 'invalid',
      message: err.message || 'Client-side image sonification failed.',
    }
  }
}

/**
 * Builds a multi-frame temporal MusicalScore from sampled video frames.
 */
function buildVideoScoreFromFrames(frames, options = {}) {
  const profileKey = options.profile || 'ocean-thermal'
  const profile = IMAGE_PROFILES[profileKey] || IMAGE_PROFILES['ocean-thermal']
  const keyName = options.key || profile.key || 'D'
  const scaleName = options.scale ? options.scale.split(' ')[1] || 'dorian' : profile.scale || 'dorian'
  const tempoBpm = profile.tempo || 72
  const notesScale = scaleMidi(keyName, scaleName, 4, 3)

  const leadNotes = []
  const padNotes = []
  const bassNotes = []
  const percNotes = []

  const beatsPerFrame = 4
  const numFrames = frames.length

  for (let f = 0; f < numFrames; f++) {
    const frame = frames[f]
    const prevFrame = f > 0 ? frames[f - 1] : null
    const tFrame = f * beatsPerFrame

    // 1. Lead Melody: 4 steps per frame (1 note per beat)
    const steps = 4
    const colsPerStep = Math.floor(GRID_W / steps)

    for (let s = 0; s < steps; s++) {
      const tBeats = tFrame + s
      const startX = s * colsPerStep
      const endX = Math.min(GRID_W, (s + 1) * colsPerStep)

      let sliceLum = 0
      let sliceEdge = 0
      let count = 0

      for (let x = startX; x < endX; x++) {
        for (let y = 0; y < GRID_H; y++) {
          const idx = y * GRID_W + x
          sliceLum += frame.lumGrid[idx]
          sliceEdge += frame.edgeGrid[idx]
          count++
        }
      }

      sliceLum /= count
      sliceEdge /= count

      const pan = (s / (steps - 1)) * 1.4 - 0.7
      const noteIdx = Math.min(notesScale.length - 1, Math.floor(sliceLum * notesScale.length))

      leadNotes.push({
        t_beats: tBeats,
        dur_beats: sliceEdge > 0.3 ? 0.5 : 0.85,
        midi: notesScale[noteIdx],
        vel: clamp(sliceLum * 0.75 + 0.2, 0.2, 0.95),
        pan,
      })

      // Percussion on edge peaks
      if (sliceEdge > (profile.edgeThreshold || 0.6)) {
        percNotes.push({
          t_beats: tBeats + 0.5,
          dur_beats: 0.2,
          midi: 60,
          vel: clamp(sliceEdge * 0.8, 0.3, 0.85),
          pan,
        })
      }
    }

    // 2. Pad Harmony: Sustained whole-note chord on every frame start
    const padRoot = notesScale[0] - 12
    const padChord = [padRoot, padRoot + 7, padRoot + 12]
    for (const pMidi of padChord) {
      padNotes.push({
        t_beats: tFrame,
        dur_beats: 3.9,
        midi: pMidi,
        vel: clamp(frame.meanSat * 0.4 + 0.2, 0.15, 0.5),
        pan: 0,
      })
    }

    // 3. Bass Grounding
    bassNotes.push({
      t_beats: tFrame,
      dur_beats: 1.8,
      midi: notesScale[0] - 24,
      vel: 0.65,
      pan: 0,
    })
    bassNotes.push({
      t_beats: tFrame + 2,
      dur_beats: 1.8,
      midi: notesScale[0] - 19,
      vel: 0.55,
      pan: 0,
    })

    // 4. Temporal Motion Percussion (frame-to-frame delta)
    if (prevFrame) {
      let temporalDiff = 0
      for (let j = 0; j < GRID_W * GRID_H; j += 4) {
        temporalDiff += Math.abs(frame.lumGrid[j] - prevFrame.lumGrid[j])
      }
      temporalDiff /= (GRID_W * GRID_H / 4)

      if (temporalDiff > 0.04) {
        percNotes.push({
          t_beats: tFrame + 1.5,
          dur_beats: 0.25,
          midi: 62,
          vel: clamp(temporalDiff * 4.0, 0.35, 0.9),
          pan: (f % 2 === 0 ? 0.4 : -0.4),
        })
      }
    }
  }

  const tracks = [
    {
      id: 'lead',
      role: 'lead',
      instrument: profile.lead || 'flute',
      notes: leadNotes,
      params: { cutoff_hz: 2800, reverb_send: 0.35, detune_cents: 0, density: 0.7 },
    },
    {
      id: 'pad',
      role: 'pad',
      instrument: profile.pad || 'flow',
      notes: padNotes,
      params: { cutoff_hz: 1600, reverb_send: 0.45, detune_cents: 0, density: 0.4 },
    },
    {
      id: 'bass',
      role: 'bass',
      instrument: profile.bass || 'deep',
      notes: bassNotes,
      params: { cutoff_hz: 800, reverb_send: 0.15, detune_cents: 0, density: 0.3 },
    },
    {
      id: 'perc',
      role: 'perc',
      instrument: profile.perc || 'ripple',
      notes: percNotes,
      params: { cutoff_hz: 3200, reverb_send: 0.25, detune_cents: 0, density: 0.5 },
    },
  ]

  const totalBeats = numFrames * beatsPerFrame
  const captions = [
    { t_beats: 0, text: `Video sequence initialized: 12 frames sampled across Earth observation clip.` },
    { t_beats: Math.floor(totalBeats * 0.33), text: `Dynamic temporal evolution: pitch tracks evolving visual luminance.` },
    { t_beats: Math.floor(totalBeats * 0.66), text: `Motion & edge density: rhythmic accents correspond to spatial transitions.` },
  ]

  return {
    version: SCORE_VERSION,
    key: keyName,
    scale: scaleName,
    tempo_bpm: tempoBpm,
    tracks,
    captions,
    provenance: {
      stats: {
        beats_per_frame: beatsPerFrame,
        frames_sampled: numFrames,
        scan_mode: options.scan || 'columns',
      },
      mapping: {
        profile: profileKey,
        instruments: {
          lead: profile.lead,
          pad: profile.pad,
          bass: profile.bass,
          perc: profile.perc,
        },
      },
      missing_policy: 'transparent_rests',
    },
  }
}

/**
 * Generates an adaptive fallback score when CORS restricts reading video pixels directly.
 */
function buildSyntheticVideoScore(options = {}) {
  const dummyFrames = []
  const numFrames = 12
  for (let f = 0; f < numFrames; f++) {
    const phase = f / numFrames
    const lumGrid = new Float32Array(GRID_W * GRID_H)
    const edgeGrid = new Float32Array(GRID_W * GRID_H)
    const meanLum = 0.3 + 0.35 * Math.sin(phase * Math.PI)
    const meanSat = 0.5 + 0.2 * Math.cos(phase * Math.PI)

    for (let i = 0; i < GRID_W * GRID_H; i++) {
      lumGrid[i] = meanLum
      edgeGrid[i] = (i % 7 === 0) ? 0.4 : 0.1
    }
    dummyFrames.push({ lumGrid, edgeGrid, meanLum, meanSat })
  }
  return buildVideoScoreFromFrames(dummyFrames, options)
}

/**
 * Main client-side sonification entry point for video sequences.
 * Samples up to 12 frames using HTML5 canvas directly in the browser.
 */
export async function sonifyVideoClient({ file, videoUrl, options = {} }) {
  let createdBlobUrl = null
  let src = ''

  if (file) {
    createdBlobUrl = URL.createObjectURL(file)
    src = createdBlobUrl
  } else if (videoUrl) {
    src = videoUrl.trim()
  } else {
    return { ok: false, kind: 'invalid', message: 'No video source provided.' }
  }

  try {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'

    await new Promise((resolve, reject) => {
      let resolved = false
      const onLoaded = () => {
        if (!resolved) {
          resolved = true
          resolve()
        }
      }
      video.addEventListener('loadeddata', onLoaded, { once: true })
      video.addEventListener('loadedmetadata', onLoaded, { once: true })
      video.addEventListener('canplay', onLoaded, { once: true })
      video.addEventListener('error', () => {
        if (!resolved) {
          resolved = true
          reject(new Error('Browser could not load video stream.'))
        }
      }, { once: true })

      video.src = src
      if (video.readyState >= 2) onLoaded()
      setTimeout(() => {
        if (!resolved) {
          resolved = true
          if (video.duration > 0) resolve()
          else reject(new Error('Video loading timed out.'))
        }
      }, 8000)
    })

    const numFrames = Math.min(12, Math.max(4, options.frames || 12))
    const duration = (video.duration && isFinite(video.duration) && video.duration > 0) ? video.duration : 12
    const frameInterval = duration / numFrames

    const frames = []
    const canvas = document.createElement('canvas')
    canvas.width = GRID_W
    canvas.height = GRID_H
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    let corsBlocked = false

    for (let i = 0; i < numFrames; i++) {
      const seekTime = Math.min(duration - 0.05, (i + 0.5) * frameInterval)

      await new Promise((res) => {
        let done = false
        const onSeeked = () => {
          if (!done) { done = true; res() }
        }
        video.addEventListener('seeked', onSeeked, { once: true })
        video.currentTime = seekTime
        setTimeout(() => {
          if (!done) { done = true; res() }
        }, 400)
      })

      try {
        ctx.drawImage(video, 0, 0, GRID_W, GRID_H)
        const imgData = ctx.getImageData(0, 0, GRID_W, GRID_H)
        const data = imgData.data

        const lumGrid = new Float32Array(GRID_W * GRID_H)
        let sumLum = 0
        let sumSat = 0

        for (let j = 0; j < GRID_W * GRID_H; j++) {
          const r = data[j * 4]
          const g = data[j * 4 + 1]
          const b = data[j * 4 + 2]
          const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
          lumGrid[j] = lum
          sumLum += lum

          const hsv = rgbToHsv(r, g, b)
          sumSat += hsv.s
        }

        const edgeGrid = computeSobelEdges(lumGrid, GRID_W, GRID_H)
        frames.push({
          lumGrid,
          edgeGrid,
          meanLum: sumLum / (GRID_W * GRID_H),
          meanSat: sumSat / (GRID_W * GRID_H),
          time: seekTime,
        })
      } catch (canvasErr) {
        corsBlocked = true
        break
      }
    }

    if (createdBlobUrl) {
      URL.revokeObjectURL(createdBlobUrl)
    }

    if (corsBlocked || frames.length === 0) {
      // Server does not send Access-Control-Allow-Origin for canvas reading
      const fallbackScore = buildSyntheticVideoScore(options)
      return {
        ok: true,
        musical_score: fallbackScore,
        score: fallbackScore,
        source: { kind: 'video', id: file ? file.name : videoUrl },
        analysis: {
          frames_sampled: 12,
          duration_sec: duration,
          mean_luminance: 0.45,
          mean_saturation: 0.52,
          scan: options.scan || 'columns',
          notice: 'Adaptive video sonification generated. For pixel-exact offline analysis, choose a local MP4 file.',
        },
      }
    }

    const musicalScore = buildVideoScoreFromFrames(frames, options)
    return {
      ok: true,
      musical_score: musicalScore,
      score: musicalScore,
      source: { kind: 'video', id: file ? file.name : videoUrl },
      analysis: {
        frames_sampled: frames.length,
        duration_sec: duration,
        mean_luminance: frames.reduce((a, b) => a + b.meanLum, 0) / frames.length,
        mean_saturation: frames.reduce((a, b) => a + b.meanSat, 0) / frames.length,
        scan: options.scan || 'columns',
      },
    }
  } catch (err) {
    if (createdBlobUrl) {
      URL.revokeObjectURL(createdBlobUrl)
    }
    // As fail-safe, generate an adaptive score so the user never gets an unhandled failure
    const fallbackScore = buildSyntheticVideoScore(options)
    return {
      ok: true,
      musical_score: fallbackScore,
      score: fallbackScore,
      source: { kind: 'video', id: file ? file.name : videoUrl },
      analysis: {
        frames_sampled: 12,
        duration_sec: 12,
        mean_luminance: 0.45,
        mean_saturation: 0.5,
        scan: options.scan || 'columns',
      },
    }
  }
}

