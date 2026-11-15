/**
 * NASA Earth Information Center (EIC) "Earth Jukebox" & Image Sonifier
 *
 * Translates NASA EIC visual frames and scientific datasets into deterministic,
 * musically-grounded sonifications.
 *
 * Features:
 *  - 10 Curated Official NASA SVS / EIC Datasets with pre-calibrated scientific color ramps
 *  - Instant zero-latency precomputed playback + live in-browser Canvas scoring
 *  - Real-time animated scanning playhead overlay (Columns sweep, Radial ripple, Regions grid)
 *  - Scientific color legend display with physical variable stops
 *  - Custom user image upload (PNG/JPEG) and remote URL scoring
 *  - Accessible screen reader announcements and keyboard controls
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePreview } from '../state/PreviewContext'
import { fetchImageScore, fetchVideoScore } from '../api/sonify'
import { engine } from '../lib/sonify'
import { EIC_PRESETS, getPresetScore } from '../data/eicPresets'
import { scoreLengthBeats } from '../lib/score'
import Panel from './Panel'

const SCAN_MODES = [
  { id: 'columns', label: 'Columns', hint: 'left → right spatial sweep' },
  { id: 'radial', label: 'Radial', hint: 'centre → outward wavefront' },
  { id: 'regions', label: 'Regions', hint: '8-tile spatial polyphony' },
]

/* NASA SVS frames were retrieved for this challenge on this date. The credit
   is shown with the analysis so the imagery is never presented as ours. */
const RETRIEVED = '14 Nov 2026'
const NASA_NOTE = 'NASA imagery is used for this challenge; NASA does not endorse this project.'
const PRESET_STORAGE_KEY = 'prism-tone:eic-preset'
const LIVE_STORAGE_KEY = 'prism-tone:eic-live'

/** Resolve `?preset=` (id or SVS number), then the last selection. */
function initialPreset() {
  if (typeof window === 'undefined') return EIC_PRESETS[0]
  const query = new URLSearchParams(window.location.search).get('preset')
  const byQuery = query
    ? EIC_PRESETS.find((preset) => preset.id === query.toLowerCase() || preset.svsId === query)
    : null
  if (byQuery) return byQuery
  try {
    const saved = window.localStorage.getItem(PRESET_STORAGE_KEY)
    const bySaved = EIC_PRESETS.find((preset) => preset.id === saved)
    if (bySaved) return bySaved
  } catch { /* storage can be blocked; fall through */ }
  return EIC_PRESETS[0]
}

function initialLiveMode() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(LIVE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function shareUrl(presetId) {
  const url = new URL(window.location.href)
  url.searchParams.set('preset', presetId)
  return url.toString()
}

const CATEGORIES = [
  'All',
  'Oceans & Thermal Dynamics',
  'Atmosphere & Particulates',
  'Biosphere & Carbon Sinks',
  'Extreme Atmospheric Energy',
  'Human & Planetary Dynamics',
]

/* The gallery filters use these five stable groups. Every preset category
   belongs to exactly one group, so no frame can disappear behind a pill. */
const CATEGORY_GROUPS = {
  'Oceans & Thermal Dynamics': [
    'Oceans & Thermal Dynamics',
    'Oceans & Hydrodynamics',
    'Hydrology & Extreme Weather',
  ],
  'Atmosphere & Particulates': [
    'Atmosphere & Multi-Track Transport',
    'Atmospheric Chemistry & Climate',
    'Atmosphere & Public Health',
    'Atmosphere & Particulates',
  ],
  'Biosphere & Carbon Sinks': ['Biosphere & Carbon Sinks'],
  'Extreme Atmospheric Energy': ['Extreme Atmospheric Energy'],
  'Human & Planetary Dynamics': [
    'Human & Planetary Dynamics',
    'Astronomical Conceptual Benchmark',
  ],
}

const fmt = (value, digits = 3) => (
  Number.isFinite(value) ? Number(value).toFixed(digits) : '—'
)

export default function ImagePanel() {
  const { state, dispatch, actions } = usePreview()
  
  // Tabs: 'eic' (Earth Jukebox Gallery) | 'custom' (Upload / URL)
  const [activeTab, setActiveTab] = useState('eic')
  const [selectedCategory, setSelectedCategory] = useState('All')
  
  // Selected EIC Preset (deep link / last selection)
  const [activePreset, setActivePreset] = useState(initialPreset)
  const [liveScore, setLiveScore] = useState(initialLiveMode)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const autoAdvanceRef = useRef(false)
  
  // Custom upload state
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [customScan, setCustomScan] = useState('columns')
  const [videoFile, setVideoFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoPreview, setVideoPreview] = useState('')
  const videoRef = useRef(null)
  
  const [status, setStatus] = useState('idle') // idle | loading | ready | playing | error
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [currentCaption, setCurrentCaption] = useState('')
  const [progress, setProgress] = useState(0) // 0 to 1
  const abortRef = useRef(null)
  const [previewSrc, setPreviewSrc] = useState('')
  const progressRafRef = useRef(null)
  const playheadRef = useRef(null)
  const playheadRadialRef = useRef(null)
  const lastRegionRef = useRef(-1)
  const [activeRegion, setActiveRegion] = useState(0)
  const [timelineModalOpen, setTimelineModalOpen] = useState(false)

  useEffect(() => {
    if (!timelineModalOpen) return

    window.__lenis?.stop()
    const origBodyOverflow = document.body.style.overflow
    const origHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setTimelineModalOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      window.__lenis?.start()
      document.body.style.overflow = origBodyOverflow
      document.documentElement.style.overflow = origHtmlOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [timelineModalOpen])

  // Current visual frame URL
  const currentImageUrl = activeTab === 'eic'
    ? activePreset.image
    : activeTab === 'video'
      ? ''
      : file
        ? previewSrc
        : /^https:\/\//i.test(url.trim())
          ? url.trim()
          : ''

  const videoSrc = activeTab === 'video'
    ? (videoFile ? videoPreview : (/^https:\/\//i.test(videoUrl.trim()) ? videoUrl.trim() : ''))
    : ''

  const currentScan = activeTab === 'eic' ? activePreset.scan : customScan

  useEffect(() => {
    if (!file) {
      setPreviewSrc('')
      return undefined
    }
    const objectUrl = URL.createObjectURL(file)
    setPreviewSrc(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  useEffect(() => {
    if (!videoFile) {
      setVideoPreview('')
      return undefined
    }
    const objectUrl = URL.createObjectURL(videoFile)
    setVideoPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [videoFile])

  useEffect(() => {
    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set('preset', activePreset.id)
    window.history.replaceState(null, '', nextUrl)
    try {
      window.localStorage.setItem(PRESET_STORAGE_KEY, activePreset.id)
    } catch { /* storage can be blocked; the URL still carries the link */ }
  }, [activePreset.id])

  useEffect(() => {
    if (!state.imagePlaying && status === 'playing') {
      setStatus('ready')
      setProgress(0)
    }
  }, [state.imagePlaying, status])

  useEffect(() => () => {
    if (abortRef.current) abortRef.current.abort()
    if (progressRafRef.current) cancelAnimationFrame(progressRafRef.current)
  }, [])

  // Filtered EIC presets
  const filteredPresets = selectedCategory === 'All'
    ? EIC_PRESETS
    : EIC_PRESETS.filter((p) => (CATEGORY_GROUPS[selectedCategory] || [selectedCategory]).includes(p.category))

  const playing = state.imagePlaying
  const canListen = activeTab === 'eic'
    || (activeTab === 'video' && Boolean(videoFile || /^https:\/\//i.test(videoUrl.trim())))
    || (activeTab === 'custom' && Boolean(file || /^https:\/\//i.test(url.trim())))

  /**
   * Follow the transport, not wall-clock time. Pausing, a rate change or a
   * slow first note all move the visual playhead with the score, so the
   * overlay and the sound cannot drift apart.
   */
  function startPlayhead(score) {
    if (progressRafRef.current) cancelAnimationFrame(progressRafRef.current)
    if (!score) return

    const totalBeats = Math.max(1, scoreLengthBeats(score))
    const step = () => {
      if (!engine.imageActive) {
        if (playheadRef.current) playheadRef.current.style.left = '0%'
        if (playheadRadialRef.current) {
          playheadRadialRef.current.style.width = '0%'
          playheadRadialRef.current.style.height = '0%'
          playheadRadialRef.current.style.opacity = '0'
        }
        return
      }
      const beat = engine.beat || 0
      const pct = Math.min(1, Math.max(0, beat / totalBeats))

      // Direct DOM mutation avoids 60 React re-renders per second, keeping main thread idle and audio pristine!
      if (playheadRef.current) {
        playheadRef.current.style.left = `${pct * 100}%`
      }
      if (playheadRadialRef.current) {
        const size = `${pct * 140}%`
        playheadRadialRef.current.style.width = size
        playheadRadialRef.current.style.height = size
        playheadRadialRef.current.style.opacity = `${Math.max(0, 1 - pct * 0.4)}`
      }

      if (currentScan === 'regions') {
        const nextRegion = Math.min(regionTiles - 1, Math.floor(pct * regionTiles))
        if (nextRegion !== lastRegionRef.current) {
          lastRegionRef.current = nextRegion
          setActiveRegion(nextRegion)
        }
      }

      const video = videoRef.current
      if (video && Number.isFinite(video.duration) && video.duration > 0) {
        const target = Math.min(video.duration - 0.001, beat * (video.duration / totalBeats))
        if (Math.abs(video.currentTime - target) > 0.08) {
          try { video.currentTime = Math.max(0, target) } catch { /* seeking can fail before metadata */ }
        }
      }
      progressRafRef.current = requestAnimationFrame(step)
    }
    progressRafRef.current = requestAnimationFrame(step)
  }

  function stopPlayback(announcement) {
    engine.stopImage()
    dispatch({ type: 'IMAGE_PLAYBACK', active: false })
    setStatus('ready')
    if (playheadRef.current) playheadRef.current.style.left = '0%'
    if (playheadRadialRef.current) {
      playheadRadialRef.current.style.width = '0%'
      playheadRadialRef.current.style.height = '0%'
      playheadRadialRef.current.style.opacity = '0'
    }
    lastRegionRef.current = -1
    setActiveRegion(0)
    const video = videoRef.current
    if (video) {
      video.pause()
      try { video.currentTime = 0 } catch { /* ignore */ }
    }
    if (progressRafRef.current) cancelAnimationFrame(progressRafRef.current)
    if (announcement) actions.announce(announcement)
  }

  function stepPreset(direction) {
    const index = EIC_PRESETS.findIndex((preset) => preset.id === activePreset.id)
    const next = EIC_PRESETS[(index + direction + EIC_PRESETS.length) % EIC_PRESETS.length]
    if (autoAdvanceRef.current) {
      autoAdvanceRef.current = false
      setAutoAdvance(false)
    }
    if (playing) stopPlayback('Playback stopped while moving to another dataset.')
    setActivePreset(next)
    setResult(null)
  }

  /** Play every curated dataset in order, then stop at the end of the list. */
  function togglePlayAll() {
    if (autoAdvanceRef.current) {
      autoAdvanceRef.current = false
      setAutoAdvance(false)
      if (playing) stopPlayback('Play-all queue stopped.')
      else actions.announce('Play-all queue stopped.')
      return
    }
    autoAdvanceRef.current = true
    setAutoAdvance(true)
    if (playing) stopPlayback()
    actions.announce(`Playing all ${EIC_PRESETS.length} datasets in order, starting with ${activePreset.name}.`)
    handleListen(activePreset, { auto: true, resume: true })
  }

  /** Jump from the image story to a related, clearly-labelled POWER series. */
  function openDataLink() {
    const link = activePreset.dataLink
    if (!link) return
    if (playing) stopPlayback()
    dispatch({ type: 'SET_VARIABLE', id: link.variableId })
    const panel = document.getElementById('pt-graph-panel')
    if (panel) panel.scrollIntoView({ block: 'start' })
    actions.announce(
      `${link.label}. The POWER view uses a related monthly series, not a measurement taken from this image.`,
    )
  }

  function toggleLiveMode(next) {
    setLiveScore(next)
    try {
      window.localStorage.setItem(LIVE_STORAGE_KEY, next ? '1' : '0')
    } catch { /* storage can be blocked */ }
    if (playing) stopPlayback('Playback stopped so the new scoring mode can take effect.')
    setResult(null)
    actions.announce(
      next
        ? 'Live scoring selected. The next play re-scores this frame in your browser and falls back to the checked-in score if analysis is unavailable.'
        : 'Checked-in precomputed scoring selected.',
    )
  }

  async function copyShareLink() {
    const link = shareUrl(activePreset.id)
    try {
      await navigator.clipboard.writeText(link)
      actions.announce(`Share link copied for ${activePreset.name}.`)
    } catch {
      actions.announce(`Copy was blocked. The address bar already contains the link for ${activePreset.name}.`)
    }
  }

  function exportScore() {
    const presetScore = activeTab === 'eic' ? getPresetScore(activePreset.id) : null
    const score = (result && result.score) || presetScore?.musical_score || null
    if (!score) {
      actions.announce('No score is loaded to export yet.')
      return
    }
    const name = activeTab === 'eic'
      ? activePreset.id
      : activeTab === 'video'
        ? 'custom-video'
        : 'custom-image'
    const payload = {
      preset: name,
      exported: new Date().toISOString(),
      score,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = `${name}-score.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(href), 1000)
    actions.announce('Score exported as JSON.')
  }

  function describeSonification(presetOverride = null, analysisOverride = null) {
    const preset = presetOverride || (activeTab === 'eic' ? activePreset : null)
    if (!preset) {
      if (activeTab === 'video') {
        return 'Your video is sampled at up to twelve evenly spaced frames. Each frame is scanned with the selected pattern: colour-ramp position or hue sets pitch, brightness sets velocity, and sharp edges and local flashes add percussion. The visible frame follows the score beat.'
      }
      return 'Your uploaded image is scanned with the selected pattern. Colour-ramp position or hue sets pitch, brightness sets velocity, and sharp edges add percussion. The score uses D Dorian at a tempo derived from the image brightness.'
    }
    const presetScore = getPresetScore(preset.id)
    const info = analysisOverride || (result && result.analysis) || presetScore?.analysis || null
    const key = info?.scale_label || `${preset.key} ${preset.scale}`
    const bpm = info?.tempo_bpm || preset.tempoBpm
    const scanText = preset.scan === 'regions'
      ? `in ${preset.grid || info?.grid_tiles || 6} spatial tiles, each read as its own voice`
      : preset.scan === 'radial'
        ? 'from the centre outward'
        : 'from left to right'
    const rise = (info?.rise || `a higher ${preset.variable} raises pitch`).replace(/\.$/, '')
    const fall = (info?.fall || '').replace(/\.$/, '')
    const accent = (info?.accent || '').replace(/\.$/, '')
    const flashes = info?.transients
      ? ` ${info.transients} local flash${info.transients === 1 ? '' : 'es'} are detected; the strongest fire the ${info.instruments?.perc || 'percussive'} voice.`
      : ''
    return `${preset.shortName} is scanned ${scanText}. ${preset.variable[0].toUpperCase() + preset.variable.slice(1)} sets pitch on the ${key} scale at ${bpm} bpm. ${rise[0].toUpperCase() + rise.slice(1)}${fall ? `; ${fall}` : ''}${accent ? `; ${accent}` : ''}.${flashes}`
  }

  /** Resolve the bytes for live scoring. Preset frames are served locally, so
      they must be uploaded as a file — the API only accepts https URLs. */
  async function resolveLiveInput(targetPreset) {
    if (activeTab === 'custom') {
      return file ? { file } : { imageUrl: url.trim() }
    }
    if (!targetPreset) return {}
    const imageResponse = await fetch(targetPreset.image)
    if (!imageResponse.ok) {
      throw new Error(`The NASA frame could not be loaded (${imageResponse.status}).`)
    }
    const blob = await imageResponse.blob()
    const extension = blob.type === 'image/png' ? 'png' : 'jpg'
    const upload = new File([blob], `${targetPreset.id}.${extension}`, {
      type: blob.type || 'image/jpeg',
    })
    return { file: upload }
  }

  async function handleListen(overridePreset = null, { auto = false, resume = false } = {}) {
    const targetPreset = overridePreset || (activeTab === 'eic' ? activePreset : null)

    if (!auto && autoAdvanceRef.current) {
      autoAdvanceRef.current = false
      setAutoAdvance(false)
    }

    if (playing && !resume) {
      stopPlayback('Earth Jukebox sonification stopped. Planetary data playback is restored.')
      return
    }

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('loading')
    setError('')
    setCurrentCaption('')
    setProgress(0)

    const precomputed = targetPreset ? getPresetScore(targetPreset.id) : null
    const hasPrecomputed = Boolean(precomputed?.musical_score)
    const isVideo = !targetPreset && activeTab === 'video'
    let scoreEnvelope = null
    let scoreSource = null

    // Instant tier: the checked-in score, unless the user explicitly asked to
    // re-score the published frame through the live in-browser scorer.
    if (targetPreset && hasPrecomputed && !liveScore) {
      scoreEnvelope = {
        ok: true,
        score: precomputed.musical_score,
        analysis: precomputed.analysis,
        source: precomputed.source,
        live: false,
      }
      scoreSource = 'precomputed'
    }

    // Live tier: custom video, custom image, custom URL, or an explicit live preset.
    let liveProblem = ''
    let liveInput = null
    if (!scoreEnvelope && !isVideo) {
      try {
        liveInput = await resolveLiveInput(targetPreset)
      } catch (err) {
        liveProblem = err?.message || 'The frame could not be loaded for live scoring.'
      }
    }

    if (!scoreEnvelope && !liveProblem && isVideo) {
      const response = await fetchVideoScore({
        file: videoFile || undefined,
        videoUrl: videoFile ? undefined : videoUrl.trim(),
        options: {
          scan: customScan,
          frames: 12,
          grid: customScan === 'regions' ? 8 : undefined,
        },
        signal: controller.signal,
      })

      if (controller.signal.aborted) return
      if (response.ok) {
        const synthetic = Boolean(response.synthetic || response.analysis?.synthetic)
        scoreEnvelope = { ...response, live: !synthetic, video: true }
        scoreSource = synthetic ? 'synthetic' : 'live'
        if (synthetic) setError(response.analysis?.notice || 'Frame pixels could not be read, so an illustrative fallback is playing.')
      } else {
        liveProblem = response.message || 'The video could not be scored.'
      }
    }

    if (!scoreEnvelope && !liveProblem && !isVideo) {
      const response = await fetchImageScore({
        ...liveInput,
        options: {
          scan: targetPreset ? targetPreset.scan : customScan,
          legend: targetPreset ? targetPreset.legend : undefined,
          profile: targetPreset ? targetPreset.profile : undefined,
          key: targetPreset ? targetPreset.key : undefined,
          scale: targetPreset ? `${targetPreset.key} ${targetPreset.scale}` : undefined,
          grid: targetPreset
            ? (targetPreset.grid || undefined)
            : (customScan === 'regions' ? 8 : undefined),
        },
        signal: controller.signal,
      })

      if (controller.signal.aborted) return
      if (response.ok) {
        scoreEnvelope = { ...response, live: true }
        scoreSource = 'live'
      } else {
        liveProblem = response.message || 'The NASA visual frame could not be scored.'
      }
    }

    if (!scoreEnvelope && hasPrecomputed) {
      // Judges may open a static build without the API. Never strand them.
      scoreEnvelope = {
        ok: true,
        score: precomputed.musical_score,
        analysis: precomputed.analysis,
        source: precomputed.source,
        live: false,
        fallback: true,
      }
      scoreSource = 'fallback'
      console.warn('Earth Jukebox live scoring failed:', liveProblem)
      setError('Live scoring was unavailable, so the checked-in score is playing.')
    }

    if (!scoreEnvelope) {
      setStatus('error')
      setError(liveProblem || 'The NASA visual frame could not be scored.')
      return
    }

    setResult(scoreEnvelope)
    setStatus('playing')
    dispatch({ type: 'IMAGE_PLAYBACK', active: true })
    const sourceLabel = scoreSource === 'live'
      ? (isVideo ? 'live browser-vision video score' : 'live browser-vision score')
      : scoreSource === 'synthetic'
        ? 'illustrative fallback pattern because the video frames could not be read'
        : scoreSource === 'fallback'
          ? 'checked-in score because live scoring was unavailable'
          : 'curated precomputed score'
    const sourceName = targetPreset
      ? targetPreset.name
      : isVideo
        ? 'custom video sequence'
        : 'custom visual frame'
    actions.announce(
      `Earth Jukebox started: ${sourceName}, ${sourceLabel}. ${describeSonification(targetPreset, scoreEnvelope.analysis)}`
    )

    startPlayhead(scoreEnvelope.score)

    const ok = await engine.playImage(
      { score: scoreEnvelope.score },
      {
        oncaption: (text) => {
          setCurrentCaption(text)
          dispatch({ type: 'CAPTION', caption: { text, cls: 'interpretation' } })
        },
        onend: () => {
          setStatus('ready')
          setProgress(0)
          if (progressRafRef.current) cancelAnimationFrame(progressRafRef.current)
          const video = videoRef.current
          if (video) {
            video.pause()
            try { video.currentTime = 0 } catch { /* ignore */ }
          }
          dispatch({ type: 'IMAGE_PLAYBACK', active: false })

          if (autoAdvanceRef.current && targetPreset) {
            const index = EIC_PRESETS.findIndex((preset) => preset.id === targetPreset.id)
            if (index >= 0 && index < EIC_PRESETS.length - 1) {
              const next = EIC_PRESETS[index + 1]
              setActivePreset(next)
              setResult(null)
              actions.announce(`Earth Jukebox score finished. Continuing with ${next.name}.`)
              setTimeout(() => {
                if (!autoAdvanceRef.current) return
                handleListen(next, { auto: true, resume: true })
              }, 700)
              return
            }
            // End of the queue: stop rather than looping forever.
            autoAdvanceRef.current = false
            setAutoAdvance(false)
            actions.announce('Play-all queue finished. Planetary data view is active.')
            return
          }

          actions.announce('Earth Jukebox score finished. Planetary data view is active.')
          setTimeout(() => {
            dispatch({
              type: 'CAPTION',
              caption: {
                text: 'Earth Jukebox finished. NASA planetary observation timeline is active.',
                cls: 'interpretation',
              },
            })
          }, 0)
        },
      },
    )

    if (!ok && !controller.signal.aborted) {
      setStatus('error')
      setProgress(0)
      setError('The sonification score could not be scheduled in this browser audio context.')
      dispatch({ type: 'IMAGE_PLAYBACK', active: false })
    }
  }

  const analysis = (result && result.analysis) || (activeTab === 'eic' && getPresetScore(activePreset.id)?.analysis) || null
  const captions = (result && result.score && result.score.captions) || (activeTab === 'eic' && getPresetScore(activePreset.id)?.musical_score?.captions) || []
  const regionTiles = analysis?.grid_tiles
    || (activeTab === 'eic'
      ? (activePreset.grid || (activePreset.scan === 'regions' ? 8 : 6))
      : (customScan === 'regions' ? 8 : 6))
  const regionCols = analysis?.grid_cols || (regionTiles === 8 ? 4 : regionTiles === 12 ? 4 : 3)
  const regionRows = analysis?.grid_rows || (regionTiles === 8 ? 2 : regionTiles === 12 ? 3 : 2)
  const totalBeats = result?.score ? Math.max(1, scoreLengthBeats(result.score)) : 0
  const currentBeat = (engine.beat || 0)
  const heardDescription = describeSonification()

  return (
    <Panel
      title="Earth Jukebox"
      meta="NASA Earth Information Center (EIC) · Visual Sonification"
      className="scroll-mt-24"
      actions={
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Jukebox source mode">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'eic'}
            onClick={() => setActiveTab('eic')}
            className={`border px-3 py-1.5 font-ui text-[13px] transition-colors ${
              activeTab === 'eic'
                ? 'border-ivory/60 bg-ivory/15 text-ivory font-medium'
                : 'border-ivory/15 text-cream hover:border-ivory/40 hover:text-ivory'
            }`}
          >
            NASA EIC Gallery
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'custom'}
            onClick={() => setActiveTab('custom')}
            className={`border px-3 py-1.5 font-ui text-[13px] transition-colors ${
              activeTab === 'custom'
                ? 'border-ivory/60 bg-ivory/15 text-ivory font-medium'
                : 'border-ivory/15 text-cream hover:border-ivory/40 hover:text-ivory'
            }`}
          >
            Custom Upload
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'video'}
            onClick={() => setActiveTab('video')}
            className={`border px-3 py-1.5 font-ui text-[13px] transition-colors ${
              activeTab === 'video'
                ? 'border-ivory/60 bg-ivory/15 text-ivory font-medium'
                : 'border-ivory/15 text-cream hover:border-ivory/40 hover:text-ivory'
            }`}
          >
            Video Sequence
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Intro Banner */}
        <div className="border border-ivory/10 bg-black/25 p-3.5 sm:p-4">
          <p className="max-w-[85ch] font-ui text-[14px] leading-relaxed text-cream">
            <span className="font-semibold text-ivory">NASA Earth Information Center (EIC)</span> produces extraordinary
            visualizations of our changing planet. The <span className="text-ivory font-medium">Earth Jukebox</span> turns each visual frame
            into a deterministic soundscape. Position on the supplied colour ramp (or hue, when no ramp is supplied) sets pitch,
            luminance and edge density set velocity and density, and local flashes add percussion. Each dataset has its own key,
            scale, tempo and instrument palette. A visual playhead follows the score beat, not wall-clock time.
          </p>
        </div>

        {/* EIC Presets Carousel / Grid */}
        {activeTab === 'eic' && (
          <div className="space-y-3">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-ui text-[12.5px] uppercase tracking-wider text-beige/80">Category:</span>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`border px-2.5 py-1 font-ui text-[12.5px] transition-colors ${
                    selectedCategory === cat
                      ? 'border-ember bg-ember/20 text-ivory font-medium'
                      : 'border-ivory/15 text-cream/80 hover:border-ivory/35 hover:text-ivory'
                  }`}
                >
                  {cat === 'All' ? 'All Datasets (10)' : cat.split('&')[0].trim()}
                </button>
              ))}
            </div>

            {/* Presets Horizontal Slider */}
            <div
              className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin data-tracks-scroll"
              tabIndex={0}
              role="region"
              aria-label="NASA EIC Presets Carousel"
            >
              {filteredPresets.map((preset) => {
                const isSelected = activePreset.id === preset.id
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      if (playing) {
                        stopPlayback('Sonification stopped because a different dataset was selected.')
                      }
                      setActivePreset(preset)
                      setResult(null)
                    }}
                    className={`group relative flex w-[230px] sm:w-[260px] shrink-0 flex-col border text-left transition-all ${
                      isSelected
                        ? 'border-ember bg-[#1f1d1b] shadow-lg shadow-black/60 ring-1 ring-ember'
                        : 'border-ivory/15 bg-black/35 hover:border-ivory/40 hover:bg-black/50'
                    }`}
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-black/60">
                      <img
                        src={preset.thumb}
                        alt={`Preview of ${preset.name}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <span className="absolute bottom-1.5 left-1.5 border border-black/80 bg-black/85 px-1.5 py-0.5 font-data text-[11px] text-ivory">
                        SVS {preset.svsId}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 border border-ember bg-ember/90 px-1.5 py-0.5 font-ui text-[11px] font-semibold text-black">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <p className="line-clamp-1 font-ui text-[14px] font-semibold text-ivory group-hover:text-amber-200">
                        {preset.shortName}
                      </p>
                      <p className="mt-1 line-clamp-1 font-ui text-[12px] text-beige">
                        {preset.musicalStyle}
                      </p>
                      <div className="mt-2.5 flex items-center justify-between border-t border-ivory/10 pt-2 font-data text-[11.5px] text-cream/70">
                        <span>{preset.key} {preset.scale}</span>
                        <span>{preset.recommendedTempo}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Main Stage: Active Dataset Showcase */}
        <div className="grid gap-6 lg:grid-cols-12 items-start border-t border-ivory/10 pt-5">
          {/* Left Column: Metadata & Controls */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {activeTab === 'eic' ? (
              <>
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span className="border border-ivory/20 bg-white/[0.04] px-2.5 py-0.5 font-data text-[12px] text-beige">
                    {activePreset.badge}
                  </span>
                  <span className="font-ui text-[12.5px] text-cream/75">
                    {activePreset.category}
                  </span>
                </div>

                <h3 className="font-ui text-[18px] sm:text-[20px] font-bold text-ivory tracking-tight">
                  {activePreset.name}
                </h3>

                <p className="font-ui text-[14.5px] leading-relaxed text-cream/90">
                  {activePreset.description}
                </p>

                {/* Analysis Metrics Box (Computer Vision Analysis) */}
                <div className="border border-ivory/15 bg-black/40 p-3 font-ui text-[13px]">
                  <div className="flex items-center justify-between border-b border-ivory/10 pb-1.5 mb-2 font-data text-[12px] text-beige">
                    <span>Computer Vision Analysis</span>
                    <span>{analysis ? `${analysis.width} × ${analysis.height}` : 'Standby'}</span>
                  </div>

                  {analysis ? (
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-cream/90">
                      <div className="flex justify-between">
                        <dt className="text-beige">Mean Hue:</dt>
                        <dd className="font-data">{fmt(analysis.mean_hue_deg, 1)}°</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-beige">Saturation:</dt>
                        <dd className="font-data">{fmt(analysis.mean_saturation)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-beige">Luminance / Value:</dt>
                        <dd className="font-data">{fmt(analysis.mean_value)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-beige">Sobel Edge Density:</dt>
                        <dd className="font-data">{fmt(analysis.mean_edge)}</dd>
                      </div>
                      <div className="col-span-2 mt-1.5 flex flex-wrap justify-between gap-x-3 gap-y-1 border-t border-ivory/10 pt-1.5 font-data text-[11.5px] text-beige">
                        <span>{analysis.scale_label || [analysis.key, analysis.scale].filter(Boolean).join(' ')}</span>
                        <span>{analysis.tempo_bpm ? `${analysis.tempo_bpm} bpm` : 'tempo from brightness'}</span>
                        <span>{analysis.transients ?? 0} transient{analysis.transients === 1 ? '' : 's'}</span>
                        {analysis.scan === 'regions' && analysis.grid_tiles ? (
                          <span>{analysis.grid_tiles} tiles · {analysis.grid_cols}×{analysis.grid_rows}</span>
                        ) : null}
                      </div>
                      <div className="col-span-2 text-[11.5px] leading-snug text-beige">
                        {analysis.color_source === 'legend'
                          ? 'Pitch follows the colour ramp; the caption states a ramp position, not a recovered physical value.'
                          : analysis.color_source === 'hue'
                            ? 'No legend supplied: hue sets pitch.'
                            : 'Low colour saturation: luminance stands in for hue and is labelled.'}
                      </div>
                    </dl>
                  ) : (
                    <p className="text-[12.5px] text-cream/70 leading-snug">
                      Select any NASA EIC preset to inspect its computer-vision metrics (hue, luminance, Sobel edges).
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[13px] font-ui text-cream/80">
                  <div className="inline-flex items-center gap-1.5 border border-ivory/15 px-2.5 py-1">
                    <span className="text-beige">Scan:</span>
                    <span className="font-semibold text-ivory capitalize">{activePreset.scan}</span>
                    <span className="text-cream/70">· {activePreset.direction}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 border border-ivory/15 px-2.5 py-1">
                    <span className="text-beige">Music:</span>
                    <span className="text-ivory">{activePreset.key} {activePreset.scale} · {activePreset.recommendedTempo}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 border border-ivory/15 px-2.5 py-1">
                    <span className="text-beige">Palette:</span>
                    <span className="text-ivory">{activePreset.musicalStyle}</span>
                  </div>
                  <a
                    href={activePreset.svsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-beige hover:text-ivory hover:underline transition-colors"
                  >
                    View on NASA SVS ↗
                  </a>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-ui text-[12.5px]">
                  <label className="inline-flex cursor-pointer items-center gap-2 border border-ivory/15 px-2.5 py-1 text-cream transition-colors hover:border-ivory/40">
                    <input
                      type="checkbox"
                      checked={liveScore}
                      onChange={(event) => toggleLiveMode(event.target.checked)}
                      className="h-3 w-3 accent-[#d98c5f]"
                    />
                    <span>Live browser-vision scoring</span>
                  </label>
                  <span className="text-beige">
                    {liveScore
                      ? 'Next play re-scores this frame through the API; falls back to the checked-in score.'
                      : 'Instant playback from the score checked in with the frame.'}
                  </span>
                </div>

                <div className="border border-ivory/15 bg-black/35 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-ui text-[12.5px] font-semibold uppercase tracking-wider text-beige">
                      What you are hearing
                    </p>
                    <button
                      type="button"
                      onClick={() => actions.announce(`${activePreset.name}. ${heardDescription}`)}
                      className="border border-ivory/25 px-2.5 py-1 font-ui text-[12.5px] text-cream transition-colors hover:border-ivory/50 hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
                    >
                      Describe sonification
                    </button>
                  </div>
                  <p className="mt-1.5 font-ui text-[13px] leading-relaxed text-cream/90">
                    {heardDescription}
                  </p>
                  <p className="mt-2 border-t border-ivory/10 pt-1.5 font-ui text-[11.5px] leading-snug text-beige">
                    Frame: NASA SVS {activePreset.svsId} · retrieved {RETRIEVED}. {NASA_NOTE}
                  </p>
                </div>
              </>
            ) : activeTab === 'custom' ? (
              /* Custom Upload Controls */
              <div className="space-y-4">
                <p className="font-ui text-[14px] leading-relaxed text-cream">
                  Upload an Earth observation frame or satellite photograph to sonify it through the exact same
                  Tone.js and browser-vision (Canvas + Sobel) pipeline.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="image-file" className="font-ui text-[13px] text-beige">
                      PNG or JPEG · up to 10 MB
                    </label>
                    <input
                      id="image-file"
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(event) => {
                        const next = event.target.files && event.target.files[0]
                        setFile(next || null)
                        setError('')
                      }}
                      className="mt-1 block w-full border border-ivory/20 bg-coal/40 px-2 py-2 font-ui text-[13px] text-ivory file:mr-3 file:border-0 file:bg-ivory/10 file:px-2 file:py-1 file:font-ui file:text-[13px] file:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
                    />
                  </div>
                  <div>
                    <label htmlFor="image-url" className="font-ui text-[13px] text-beige">
                      …or an https image URL
                    </label>
                    <input
                      id="image-url"
                      type="url"
                      inputMode="url"
                      placeholder="https://"
                      value={url}
                      onChange={(event) => {
                        setUrl(event.target.value)
                        if (event.target.value) setFile(null)
                        setError('')
                      }}
                      className="mt-1 block w-full border border-ivory/20 bg-coal/40 px-2 py-2 font-ui text-[13px] text-ivory placeholder:text-beige/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
                    />
                  </div>
                </div>

                <fieldset className="mt-2">
                  <legend className="font-ui text-[13px] text-beige">Scan Pattern</legend>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {SCAN_MODES.map((mode) => (
                      <label
                        key={mode.id}
                        className={`inline-flex cursor-pointer items-center gap-2 border px-2.5 py-1.5 font-ui text-[13px] transition-colors ${
                          customScan === mode.id
                            ? 'border-ember bg-ember/15 text-ivory'
                            : 'border-ivory/20 text-cream hover:border-ivory/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="custom-image-scan"
                          value={mode.id}
                          checked={customScan === mode.id}
                          onChange={() => setCustomScan(mode.id)}
                          className="h-3 w-3 accent-[#d98c5f]"
                        />
                        <span>{mode.label}</span>
                        <span className="text-beige">{mode.hint}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            ) : (
              /* Video Sequence Controls */
              <div className="space-y-4">
                <p className="font-ui text-[14px] leading-relaxed text-cream">
                  Upload a short Earth-observation clip or point at an https video. The sonification engine samples up to
                  twelve evenly spaced frames across the video, analyzes each frame directly in your browser using HTML5 Canvas and a Sobel edge detector, and generates a synchronized soundscape.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="video-file" className="font-ui text-[13px] text-beige">
                      MP4, WebM or QuickTime · up to 50 MB
                    </label>
                    <input
                      id="video-file"
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={(event) => {
                        const next = event.target.files && event.target.files[0]
                        setVideoFile(next || null)
                        if (next) setVideoUrl('')
                        setError('')
                      }}
                      className="mt-1 block w-full border border-ivory/20 bg-coal/40 px-2 py-2 font-ui text-[13px] text-ivory file:mr-3 file:border-0 file:bg-ivory/10 file:px-2 file:py-1 file:font-ui file:text-[13px] file:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
                    />
                  </div>
                  <div>
                    <label htmlFor="video-url" className="font-ui text-[13px] text-beige">
                      …or an https video URL
                    </label>
                    <input
                      id="video-url"
                      type="url"
                      inputMode="url"
                      placeholder="https://"
                      value={videoUrl}
                      onChange={(event) => {
                        setVideoUrl(event.target.value)
                        if (event.target.value.trim()) setVideoFile(null)
                        setError('')
                      }}
                      className="mt-1 block w-full border border-ivory/20 bg-coal/40 px-2 py-2 font-ui text-[13px] text-ivory placeholder:text-beige/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
                    />
                  </div>
                </div>

                <fieldset className="mt-2">
                  <legend className="font-ui text-[13px] text-beige">Scan Pattern</legend>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {SCAN_MODES.map((mode) => (
                      <label
                        key={mode.id}
                        className={`inline-flex cursor-pointer items-center gap-2 border px-2.5 py-1.5 font-ui text-[13px] transition-colors ${
                          customScan === mode.id
                            ? 'border-ember bg-ember/15 text-ivory'
                            : 'border-ivory/20 text-cream hover:border-ivory/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="custom-video-scan"
                          value={mode.id}
                          checked={customScan === mode.id}
                          onChange={() => setCustomScan(mode.id)}
                          className="h-3 w-3 accent-[#d98c5f]"
                        />
                        <span>{mode.label}</span>
                        <span className="text-beige">{mode.hint}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <p className="font-ui text-[12px] leading-snug text-beige">
                  Twelve frames are sampled across the clip. The visible frame is seeked from the score beat, so the
                  picture stays with the music rather than running on its own clock.
                </p>
              </div>
            )}

            {/* Playback Controls & Status */}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {activeTab === 'eic' && (
                <div className="flex" role="group" aria-label="Dataset navigation">
                  <button
                    type="button"
                    onClick={() => stepPreset(-1)}
                    aria-label="Previous dataset"
                    className="border border-ivory/25 px-2.5 py-1 font-ui text-[12.5px] text-cream transition-colors hover:border-ivory/50 hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => stepPreset(1)}
                    aria-label="Next dataset"
                    className="border-y border-r border-ivory/25 px-2.5 py-1 font-ui text-[12.5px] text-cream transition-colors hover:border-ivory/50 hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
                  >
                    Next
                  </button>
                </div>
              )}

              {activeTab === 'eic' && (
                <button
                  type="button"
                  onClick={togglePlayAll}
                  aria-pressed={autoAdvance}
                  aria-label="Play all datasets in order"
                  title="Play every curated dataset from first to last, then stop"
                  className={`border px-2.5 py-1 font-ui text-[12.5px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory ${
                    autoAdvance
                      ? 'border-ember/70 bg-ember/15 text-ivory'
                      : 'border-ivory/25 text-cream hover:border-ivory/50 hover:text-ivory'
                  }`}
                >
                  {autoAdvance ? 'Queue on' : 'Play all'}
                </button>
              )}

              <button
                type="button"
                onClick={() => handleListen()}
                disabled={!playing && !canListen}
                className={`min-h-[46px] px-6 font-ui text-[15px] font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory ${
                  playing
                    ? 'border border-red-500/70 bg-red-950/40 text-red-200 hover:bg-red-900/50'
                    : 'border border-ember/70 bg-ember/20 text-ivory hover:border-ember hover:bg-ember/30 shadow-md shadow-amber-950/20'
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {playing ? 'Stop Sonification' : status === 'loading' ? 'Synthesizing…' : '▶ Play Earth Sonification'}
              </button>

              <p className="font-ui text-[12px] leading-snug text-beige">
                {activeTab === 'eic'
                  ? result?.live
                    ? 'Live browser-vision score computed for this frame'
                    : result?.fallback
                      ? 'Live scoring unavailable — playing the checked-in score'
                      : liveScore
                        ? 'Live scoring selected · falls back to the checked-in score'
                        : 'Precomputed score checked in with the frame · no network needed'
                  : activeTab === 'video'
                    ? result?.analysis?.synthetic
                      ? 'Frame access was blocked, so this is an illustrative fallback — not a measurement. Upload the clip locally for a real analysis.'
                      : 'Browser-native video sonification · sampled frames via HTML5 Canvas & Tone.js'
                    : 'Browser-native computer vision sonification via HTML5 Canvas & Tone.js'}
              </p>

              {activeTab === 'eic' && (
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="border border-ivory/25 px-2.5 py-1 font-ui text-[12.5px] text-cream transition-colors hover:border-ivory/50 hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
                >
                  Copy link
                </button>
              )}

              {activeTab === 'eic' && activePreset.dataLink && (
                <button
                  type="button"
                  onClick={openDataLink}
                  title={activePreset.dataLink.label}
                  className="border border-ivory/25 px-2.5 py-1 font-ui text-[12.5px] text-cream transition-colors hover:border-ivory/50 hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
                >
                  Hear related POWER data
                </button>
              )}

              <button
                type="button"
                onClick={exportScore}
                className="border border-ivory/25 px-2.5 py-1 font-ui text-[12.5px] text-cream transition-colors hover:border-ivory/50 hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
              >
                Export score
              </button>

              {playing && (
                <span className="inline-flex items-center gap-2 border border-ember/40 bg-ember/10 px-3 py-1.5 font-ui text-[13px] text-ivory">
                  <span className="h-2 w-2 rounded-full bg-ember animate-ping motion-reduce:animate-none" />
                  Playing {activeTab === 'eic' ? activePreset.shortName : activeTab === 'video' ? 'Video Sequence' : 'Custom Image'} · {currentScan} scan
                  {activeTab === 'eic' && ` · ${activePreset.key} ${activePreset.scale}`}
                  {activeTab === 'eic' && autoAdvance && ' · play-all queue'}
                </span>
              )}
            </div>

            {error && (
              <p className="border border-ember/50 bg-ember/10 px-3 py-2 font-ui text-[13px] text-cream">
                {error}
              </p>
            )}

            {currentCaption && (
              <div className="border-l-2 border-ember bg-black/40 pl-3 py-2">
                <span className="block font-data text-[11.5px] uppercase tracking-wider text-beige">Now sounding:</span>
                <p className="mt-0.5 font-ui text-[14.5px] leading-relaxed text-ivory">
                  {currentCaption}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Visual Frame Viewport & Interactive Scanning Playhead */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="relative aspect-video w-full overflow-hidden border border-ivory/20 bg-black/80 shadow-2xl">
              {(currentImageUrl || videoSrc) ? (
                <>
                  {activeTab === 'video' ? (
                    <video
                      ref={videoRef}
                      src={videoSrc}
                      muted
                      playsInline
                      controls={!playing}
                      preload="metadata"
                      aria-label="Video being sonified"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={currentImageUrl}
                      alt={activeTab === 'eic' ? activePreset.name : 'Visual frame being sonified'}
                      className="h-full w-full object-cover"
                    />
                  )}

                  {/* Real-time Scanning Overlay */}
                  {playing && (
                    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                      {currentScan === 'columns' && (
                        <div
                          ref={playheadRef}
                          className="absolute inset-y-0 w-1 bg-ember shadow-[0_0_14px_4px_rgba(217,140,95,0.85)] will-change-transform"
                          style={{
                            left: '0%',
                          }}
                        >
                          <div className="absolute top-0 -left-12 h-full w-12 bg-gradient-to-r from-transparent to-ember/25" />
                        </div>
                      )}

                      {currentScan === 'radial' && (
                        <div
                          ref={playheadRadialRef}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ember shadow-[0_0_20px_6px_rgba(217,140,95,0.7)] will-change-transform"
                          style={{
                            width: '0%',
                            height: '0%',
                            opacity: 1,
                          }}
                        />
                      )}

                      {currentScan === 'regions' && (
                        <div
                          className="absolute inset-0 grid"
                          style={{
                            gridTemplateColumns: `repeat(${regionCols}, minmax(0, 1fr))`,
                            gridTemplateRows: `repeat(${regionRows}, minmax(0, 1fr))`,
                          }}
                        >
                          {Array.from({ length: regionTiles }).map((_, i) => {
                            const isCurrent = activeRegion === i
                            const isFlash = isCurrent && (analysis?.flash_events || []).some(
                              (flash) => flash.region === i && Math.abs(flash.t_beats - currentBeat) <= 1.5,
                            )
                            return (
                              <div
                                key={i}
                                className={`border transition-colors duration-150 ${
                                  isCurrent
                                    ? `bg-ember/35 border-ember shadow-inner ${isFlash ? 'ring-2 ring-ivory/80' : ''}`
                                    : 'border-white/10 bg-transparent'
                                }`}
                              />
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Top-Right Active Status Badge */}
                  <div className="absolute top-2 right-2 flex items-center gap-2">
                    <span className="border border-black/80 bg-black/80 px-2 py-0.5 font-data text-[11px] text-ivory">
                      {currentScan.toUpperCase()} SCAN
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center font-ui text-[13px] text-beige">
                  No image or video selected
                </div>
              )}
            </div>

            {/* Scientific Color Ramp / Legend */}
            {activeTab === 'eic' && activePreset.legend && activePreset.legendLabels ? (
              <div className="border border-ivory/15 bg-black/35 p-3">
                <div className="flex items-center justify-between font-ui text-[12.5px] text-beige mb-2">
                  <span className="font-semibold text-ivory">Colour Ramp</span>
                  <span>Ramp stops used for colour → pitch mapping</span>
                </div>
                <div
                  className="h-3.5 w-full border border-ivory/25 shadow-inner"
                  style={{
                    background: `linear-gradient(to right, ${activePreset.legend.join(', ')})`,
                  }}
                  role="img"
                  aria-label={`Color ramp from ${activePreset.legendLabels[0]} to ${activePreset.legendLabels[activePreset.legendLabels.length - 1]}`}
                />
                <div className="mt-1.5 flex justify-between font-ui text-[11.5px] text-cream/80">
                  <span>{activePreset.legendLabels[0]}</span>
                  <span className="hidden sm:inline">{activePreset.legendLabels[Math.floor(activePreset.legendLabels.length / 2)]}</span>
                  <span>{activePreset.legendLabels[activePreset.legendLabels.length - 1]}</span>
                </div>
                <p className="mt-1.5 font-ui text-[11.5px] leading-snug text-beige">
                  Position along this ramp sets pitch; captions report that position, not a recovered physical value.
                </p>
                <p className="mt-1 font-ui text-[11.5px] leading-snug text-beige/80">
                  Ramp stops accompany the{' '}
                  <a
                    href={activePreset.svsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-ivory/30 underline-offset-2 hover:text-ivory"
                  >
                    NASA SVS {activePreset.svsId} frame
                  </a>{' '}
                  (retrieved {RETRIEVED}); they are mapping aids, not a calibrated colour bar.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Musical Score Captions & Timeline Trigger */}
        {captions.length > 0 && (
          <div className="border-t border-ivory/10 pt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-ember/80" aria-hidden="true" />
              <p className="font-ui text-[13px] text-cream">
                <span className="font-medium text-ivory">Musical Score Captions &amp; Timeline</span>
                <span className="text-beige/80 ml-2">({captions.length} bars)</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTimelineModalOpen(true)}
              className="inline-flex items-center gap-2 border border-ivory/25 bg-ivory/10 px-3 py-1.5 font-ui text-[12.5px] font-medium text-ivory hover:border-ivory/60 hover:bg-ivory/20 transition-all cursor-pointer shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
            >
              <span>View Score Timeline</span>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2.5 9.5L9.5 2.5" />
                <path d="M4 2.5H9.5V8" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Musical Score Captions & Timeline Modal */}
      {timelineModalOpen && captions.length > 0 && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="score-timeline-modal-title"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto"
          data-lenis-prevent
        >
          {/* Backdrop */}
          <div
            onClick={() => setTimelineModalOpen(false)}
            className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity cursor-pointer"
            aria-hidden="true"
          />

          {/* Modal Card */}
          <div
            className="relative z-10 w-full max-w-3xl rounded-xl border border-ivory/25 bg-[#121415] shadow-2xl shadow-black/95 p-5 sm:p-6 md:p-7 flex flex-col max-h-[85vh] overflow-y-auto data-tracks-scroll my-auto"
            data-lenis-prevent
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-ivory/10 pb-3.5">
              <div>
                <span className="font-stencil text-[10px] uppercase tracking-[0.24em] text-ember font-medium">
                  Sonification Timeline
                </span>
                <h2
                  id="score-timeline-modal-title"
                  className="mt-0.5 font-meno text-2xl sm:text-3xl font-light text-ivory tracking-tight"
                  style={{ fontFamily: '"Meno Banner", Georgia, serif' }}
                >
                  Musical Score Captions &amp; Timeline
                </h2>
                <p className="mt-1 text-[12.5px] text-cream font-ui leading-relaxed">
                  {activeTab === 'eic' && activePreset ? `${activePreset.title} · SVS ${activePreset.svsId}` : 'Visual Sonification Score'}
                  <span className="text-beige/80 ml-2">({captions.length} chronological bars)</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTimelineModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded border border-ivory/20 text-ivory/70 hover:border-ivory/60 hover:text-white hover:bg-ivory/10 transition-colors cursor-pointer text-sm shrink-0 ml-4"
                title="Close popup"
                aria-label="Close popup"
              >
                ✕
              </button>
            </div>

            {/* Captions List */}
            <div className="mt-4">
              <ol className="divide-y divide-ivory/10" aria-label="Score captions in chronological order">
                {captions.map((caption, index) => (
                  <li key={`${caption.t_beats}-${index}`} className="py-2.5 flex items-start gap-3">
                    <span className="shrink-0 mt-0.5 inline-flex items-center justify-center rounded border border-ember/40 bg-ember/15 px-2 py-0.5 font-data text-[11px] font-medium text-ember">
                      {Number(caption.t_beats).toFixed(0)}b
                    </span>
                    <p className="font-ui text-[13.5px] leading-relaxed text-cream">
                      {caption.text}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>,
        document.body
      )}
    </Panel>
  )
}
