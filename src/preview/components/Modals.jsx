import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { usePreview } from '../state/PreviewContext'
import { CONTINENTS, CONTINENT_BY_ID } from '../data/world'
import { markGuideSeen } from '../lib/settings'
import continentPaths from '../data/continentPaths.json'

const GUIDE_STEPS = [
  [
    'Choose climate tracks',
    'Pick what you want to experience — Temperature, Rainfall, or Wind. You can listen to a single track or combine multiple layers. The lead track drives the map colors, tempo, and primary audio melody.'
  ],
  [
    'Explore the interactive map',
    'Click directly on any continent or use “Select Continent” to zoom in. You can also search for any country to isolate it and inspect its local climate data up close.'
  ],
  [
    'Select a time period',
    'Choose any year from 1981 to 2025, pick an individual month, or play through a custom date range to watch and hear how climate patterns shift across the seasons.'
  ],
  [
    'Play and hear the data',
    'Press the Play button to start sonification. Atmospheric values are turned into musical harmony in real-time, accompanied by clear captions explaining the numbers and sounds.'
  ],
  [
    'Inspect graphs and trends',
    'Review the charts and data summary to see historical highs, lows, and 1991–2020 averages. Hover or tap on graph points to preview individual monthly tones.'
  ],
  [
    'Personalize your view',
    'Open “DISPLAY” in the top menu to adjust caption text sizes, sound on hover, and haptics. Your preferences are saved automatically in your browser.'
  ],
]

/* =========================================================================
   1. GuideModal — First-time dismissible dialog guide
   ========================================================================= */
export function GuideModal() {
  const { state, dispatch } = usePreview()
  const closeRef = useRef(null)
  const modalContainerRef = useRef(null)

  useEffect(() => {
    if (!state.guideOpen) return

    // 1. Lock background page scroll completely (Lenis smooth scroll + native overflow)
    window.__lenis?.stop()
    const origBodyOverflow = document.body.style.overflow
    const origHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    // 2. Ensure modal content starts from the very beginning (top)
    if (modalContainerRef.current) {
      modalContainerRef.current.scrollTop = 0
    }

    // 3. Hide navbar while guide popup is active so it never overlaps or shows
    const nav = document.querySelector('header')
    let prevOpacity = ''
    let prevVisibility = ''
    let prevPointerEvents = ''
    if (nav) {
      prevOpacity = nav.style.opacity
      prevVisibility = nav.style.visibility
      prevPointerEvents = nav.style.pointerEvents
      nav.style.opacity = '0'
      nav.style.visibility = 'hidden'
      nav.style.pointerEvents = 'none'
    }

    // 4. Focus top close button safely without scrolling container down
    const prev = document.activeElement
    if (closeRef.current) {
      closeRef.current.focus({ preventScroll: true })
    }

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      // Re-enable background scrolling on modal dismiss
      window.__lenis?.start()
      document.body.style.overflow = origBodyOverflow
      document.documentElement.style.overflow = origHtmlOverflow
      document.removeEventListener('keydown', onKey)
      if (nav) {
        nav.style.opacity = prevOpacity
        nav.style.visibility = prevVisibility
        nav.style.pointerEvents = prevPointerEvents
      }
      if (prev && prev.focus) prev.focus()
    }
  }, [state.guideOpen, dispatch])

  const close = () => {
    markGuideSeen()
    dispatch({ type: 'GUIDE', open: false })
  }

  const modalContent = state.guideOpen ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/88 p-4 sm:p-6 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pt-guide-title"
      data-lenis-prevent
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        ref={modalContainerRef}
        className="relative max-h-[86vh] w-full max-w-3xl lg:max-w-[820px] overflow-y-auto rounded-xl border border-ivory/15 bg-[#141617] p-6 sm:p-8 md:p-10 shadow-2xl shadow-black/95"
        data-lenis-prevent
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ivory/10 pb-4 sm:pb-5">
          <div>
            <h2 id="pt-guide-title" className="font-stencil text-[14px] sm:text-[15px] uppercase tracking-[0.26em] text-ivory font-medium">
              How to use this page
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline font-data text-[12px] uppercase tracking-[0.16em] text-cream">6 steps · ~1 min</span>
            <button
              ref={closeRef}
              type="button"
              onClick={() => close()}
              className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded border border-ivory/25 text-[13px] text-ivory transition-colors hover:border-ivory/60 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory cursor-pointer"
              title="Close guide"
              aria-label="Close guide"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 1-Column Sequential Steps List */}
        <ol className="mt-5 flex flex-col divide-y divide-white/8">
          {GUIDE_STEPS.map(([title, body], i) => (
            <li key={title} className="flex items-start gap-4 sm:gap-5 py-4 sm:py-4.5 first:pt-2 last:pb-2">
              <span className="font-data text-[16px] sm:text-[17px] font-semibold text-beige tracking-wider shrink-0 w-8 pt-0.5 select-none">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1">
                <h3 className="font-ui text-[18px] sm:text-[19px] font-semibold tracking-wide text-ivory">{title}</h3>
                <p className="mt-1.5 font-ui text-[15.5px] sm:text-[16px] leading-relaxed text-cream font-normal">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* Footer note */}
        <p className="mt-6 border-t border-ivory/10 pt-5 font-ui text-[15px] leading-relaxed text-cream font-normal">
          Everything on this page is computed from authentic NASA POWER meteorological records (1981–2025).
          Gaps stay silent, derived values are clearly labelled, and nothing is artificially fabricated.
          You can reopen this guide anytime by clicking <span className="font-stencil text-beige tracking-wider">GUIDE</span> in the top bar.
        </p>

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => close()}
            className="border border-ivory/40 bg-ivory/15 px-7 py-3 font-stencil text-[12px] uppercase tracking-[0.22em] text-ivory font-semibold hover:bg-ivory hover:text-[#121313] transition-colors duration-200 rounded-sm cursor-pointer shadow-sm"
          >
            Start exploring
          </button>
          <button
            type="button"
            onClick={() => {
              close()
              dispatch({ type: 'TOGGLE_SETTINGS', open: true })
            }}
            className="border border-white/20 px-6 py-3 font-stencil text-[12px] uppercase tracking-[0.18em] text-ivory hover:border-ivory/50 hover:bg-white/5 transition-colors duration-200 rounded-sm cursor-pointer"
          >
            Display &amp; access
          </button>
        </div>
      </div>
    </div>
  ) : null

  return typeof document !== 'undefined' && modalContent
    ? createPortal(modalContent, document.body)
    : modalContent
}

/* =========================================================================
   2. ContinentModal — Global Continents Selection Card Grid Popup
   ========================================================================= */
function ContinentSilhouette({ id, color }) {
  const path = continentPaths[id]
  if (!path) return null

  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full transition-transform duration-300 group-hover:scale-105"
      fill={color || '#f2ede3'}
      fillOpacity="0.88"
      stroke={color || '#f2ede3'}
      strokeWidth="0.8"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} fillRule="evenodd" />
    </svg>
  )
}

export function ContinentModal() {
  const { state, dispatch } = usePreview()
  const modalRef = useRef(null)

  const currentScopeId = state.scope.type === 'division' ? state.scope.id : 'asia'
  const [selectedId, setSelectedId] = useState(currentScopeId)

  /* Sync selection when modal opens */
  useEffect(() => {
    if (state.continentModalOpen) {
      setSelectedId(state.scope.type === 'division' ? state.scope.id : 'asia')
    }
  }, [state.continentModalOpen, state.scope])

  /* Escape key to dismiss */
  useEffect(() => {
    if (!state.continentModalOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        dispatch({ type: 'CONTINENT_MODAL', open: false })
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [state.continentModalOpen, dispatch])

  if (!state.continentModalOpen) return null

  const handleConfirm = () => {
    dispatch({ type: 'SET_SCOPE', scope: { type: 'division', id: selectedId } })
    dispatch({ type: 'CONTINENT_MODAL', open: false })
  }

  const selectedItem = CONTINENT_BY_ID[selectedId] || CONTINENTS[0]

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="continent-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto"
      data-lenis-prevent
    >
      {/* Dark Blur Backdrop — covers entire viewport and navbar */}
      <div
        onClick={() => dispatch({ type: 'CONTINENT_MODAL', open: false })}
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity cursor-pointer"
        aria-hidden="true"
      />

      {/* Modal Dialog Card (Scaled proportionally to ~80-85%) */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-4xl xl:max-w-5xl rounded-xl border border-ivory/20 bg-[#121415] shadow-2xl shadow-black/95 p-5 sm:p-6 md:p-7 flex flex-col max-h-[85vh] overflow-y-auto my-auto"
        data-lenis-prevent
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-ivory/10 pb-3 md:pb-4">
          <div>
            <span className="font-stencil text-[9.5px] sm:text-[10px] uppercase tracking-[0.24em] text-ember font-medium">
              Geographic Scope Selection
            </span>
            <h2
              id="continent-modal-title"
              className="mt-0.5 font-meno text-xl sm:text-2xl md:text-3xl font-light text-ivory tracking-tight"
              style={{ fontFamily: '"Meno Banner", Georgia, serif' }}
            >
              Select Your Continent
            </h2>
            <p className="mt-1 text-[11px] sm:text-[12px] text-parchment/80 font-ui leading-relaxed">
              Pick a continent to inspect genuine NASA POWER climatological observations across all seasons.
            </p>
          </div>

          <button
            id="continent-modal-close-btn"
            type="button"
            onClick={() => dispatch({ type: 'CONTINENT_MODAL', open: false })}
            className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded border border-ivory/20 text-ivory/70 hover:border-ivory/60 hover:text-white hover:bg-ivory/10 transition-colors cursor-pointer text-sm shrink-0 ml-4"
            title="Close popup"
          >
            ✕
          </button>
        </div>

        {/* 7-Continent Grid (Proportionally scaled cards and silhouettes) */}
        <div className="mt-4 sm:mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3.5 md:gap-4">
          {CONTINENTS.map((c) => {
            const isSelected = selectedId === c.id

            return (
              <button
                key={c.id}
                id={`continent-card-${c.id}`}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`group relative flex flex-col items-center justify-between rounded-xl p-3.5 sm:p-4 text-center transition-all cursor-pointer border ${isSelected
                  ? 'shadow-2xl scale-[1.03] outline outline-1.5'
                  : 'border-ivory/15 bg-coal/50 hover:border-ivory/40 hover:bg-ivory/5 hover:scale-[1.01]'
                  }`}
                style={{
                  borderColor: isSelected ? c.border : undefined,
                  boxShadow: isSelected ? `0 0 24px ${c.glow}` : undefined,
                  outlineColor: isSelected ? c.border : undefined,
                  backgroundColor: isSelected ? `${c.color}18` : undefined,
                }}
              >
                {/* Scaled Continent Silhouette Shape */}
                <div className="my-1.5 sm:my-2 flex h-20 w-20 sm:h-24 sm:w-24 md:h-26 md:w-26 items-center justify-center">
                  <ContinentSilhouette id={c.id} color={c.color} />
                </div>

                {/* Continent Name & Regional Subtitle */}
                <div className="mt-2 w-full">
                  <p className="font-ui text-sm sm:text-base font-semibold text-ivory tracking-wide">
                    {c.name}
                  </p>
                  <p className="mt-0.5 font-stencil text-[9px] sm:text-[9.5px] uppercase tracking-wider text-parchment/75 truncate">
                    {c.sampleCity}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-5 sm:mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ivory/10 pt-3.5 sm:pt-4">
          <div className="flex items-center gap-2">
            <span className="font-stencil text-[9.5px] sm:text-[10px] uppercase tracking-wider text-parchment">Target:</span>
            <span className="font-ui text-xs sm:text-sm font-semibold text-ivory">
              {selectedItem ? selectedItem.name : 'Asia'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="continent-modal-cancel-btn"
              type="button"
              onClick={() => dispatch({ type: 'CONTINENT_MODAL', open: false })}
              className="rounded-md border border-ivory/20 px-3.5 py-1.5 sm:px-4 sm:py-2 font-stencil text-[9.5px] sm:text-[10px] uppercase tracking-[0.2em] text-parchment hover:border-ivory/50 hover:text-ivory transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="continent-modal-confirm-btn"
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-1.5 rounded-md border border-ember bg-ember/90 px-4 py-1.5 sm:px-5 sm:py-2 font-stencil text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-[#121414] font-bold hover:bg-ember hover:shadow-lg hover:shadow-ember/30 transition-all cursor-pointer"
            >
              <span>See Continent</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent
}

export default { GuideModal, ContinentModal }

