/**
 * Display & access drawer.
 *
 * Everything a visitor can change about how this page presents itself:
 * caption visibility and size, contrast, motion, haptics, graph hover sound,
 * “Describe this view”, and the keyboard map. Settings persist locally.
 * The drawer is a focus-trapped dialog rendered into document.body so it is
 * never clipped by the map or deck, and restores focus when it closes.
 */

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePreview } from '../state/PreviewContext'
import { CAPTION_SIZES, DEFAULT_SETTINGS } from '../lib/settings'
import { SHORTCUTS } from './Accessibility'
import { getAvailableVoices, isBraveBrowser, speak } from '../lib/speech'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'

export default function SettingsDrawer() {
  const { state, dispatch, actions } = usePreview()
  const open = state.settingsOpen
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const [voices, setVoices] = useState(() => getAvailableVoices())

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const update = () => setVoices(getAvailableVoices())
    update()
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', update)
      return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
    } else if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = update
    }
  }, [])

  useEffect(() => {
    if (!open) return

    window.__lenis?.stop()
    const bodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const previous = document.activeElement
    closeRef.current?.focus({ preventScroll: true })

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        dispatch({ type: 'TOGGLE_SETTINGS', open: false })
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = Array.from(panelRef.current.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      window.__lenis?.start()
      document.body.style.overflow = bodyOverflow
      document.removeEventListener('keydown', onKey)
      if (previous && previous.focus) previous.focus()
    }
  }, [open, dispatch])

  if (!open || typeof document === 'undefined') return null

  const set = (key, value) => dispatch({ type: 'SET_SETTING', key, value })
  const settings = state.settings || DEFAULT_SETTINGS

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex justify-end bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pt-settings-title"
      data-lenis-prevent
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dispatch({ type: 'TOGGLE_SETTINGS', open: false })
      }}
    >
      <div
        ref={panelRef}
        className="relative flex h-full w-full max-w-[460px] flex-col border-l border-ivory/20 bg-[#151717] shadow-2xl shadow-black/80"
        data-lenis-prevent
      >
        {/* header */}
        <div className="flex items-start justify-between gap-4 border-b border-ivory/10 px-5 py-5">
          <div>
            <p className="font-stencil text-[12px] uppercase tracking-[0.24em] text-ember">Display &amp; access</p>
            <h2
              id="pt-settings-title"
              className="mt-1 text-[26px] font-light leading-tight text-ivory"
              style={{ fontFamily: '"Meno Banner", Georgia, serif' }}
            >
              Make the page yours
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => dispatch({ type: 'TOGGLE_SETTINGS', open: false })}
            aria-label="Close display and accessibility settings"
            className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded border border-ivory/25 text-[13px] text-ivory transition-colors hover:border-ivory/60 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5" data-lenis-prevent>
          {/* captions */}
          <section aria-labelledby="pt-cap-title">
            <h3 id="pt-cap-title" className="font-stencil text-[12px] uppercase tracking-[0.2em] text-beige">
              Show Captions
            </h3>

            <ToggleRow
              label="Captions describe the data and the sound even when the volume is zero or muted."
              checked={settings.captionsVisible}
              onChange={(v) => set('captionsVisible', v)}
            />

            <fieldset className="mt-4 border border-ivory/15 p-3.5">
              <legend className="px-1 font-ui text-[14px] text-ivory">Caption size</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {Object.entries(CAPTION_SIZES).map(([id, size]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={settings.captionSize === id}
                    onClick={() => set('captionSize', id)}
                    className={`min-w-[52px] border px-3 py-2 font-data text-[14px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory ${settings.captionSize === id
                      ? 'border-ivory/70 bg-ivory/15 text-ivory'
                      : 'border-ivory/20 text-cream hover:border-ivory/45'
                      }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
              <p
                className="mt-3 border-t border-ivory/10 pt-3 font-ui leading-[1.5] text-cream"
                style={{ fontSize: `${CAPTION_SIZES[settings.captionSize]?.px || 23}px` }}
              >
                July 2010 - sample text at the selected size.
              </p>
            </fieldset>
          </section>

          {/* sound */}
          <section aria-labelledby="pt-sound-title" className="mt-6 border-t border-ivory/10 pt-5">
            <h3 id="pt-sound-title" className="font-stencil text-[12px] uppercase tracking-[0.2em] text-beige">
              Sound
            </h3>

            <fieldset className="mt-3 border border-ivory/15 p-3.5">
              <legend className="px-1 font-ui text-[14px] text-ivory">Listening mode</legend>
              <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Listening mode">
                {[['analysis', 'Analysis'], ['ambient', 'Ambient']].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={(settings.soundMode || 'analysis') === id}
                    onClick={() => actions.setSoundMode(id)}
                    className={`min-w-[92px] border px-3 py-2 font-data text-[14px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory ${(settings.soundMode || 'analysis') === id
                      ? 'border-ivory/70 bg-ivory/15 text-ivory'
                      : 'border-ivory/20 text-cream hover:border-ivory/45'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 font-ui text-[13px] leading-relaxed text-beige">
                Analysis maps every value to pitch for close listening. Ambient keeps one fixed pitch and lets
                loudness and texture follow the data, then loops as a background bed — easier to leave running.
              </p>
            </fieldset>

            <ToggleRow
              label="Sounding on graph hover"
              hint="A single soft note when you hover or focus a point on the series graph. Never during playback."
              checked={settings.hoverSonify}
              onChange={(v) => set('hoverSonify', v)}
            />
            <ToggleRow
              label="Haptic feedback"
              hint="A short vibration on supported phones as each month sounds. Off by default."
              checked={settings.haptics}
              onChange={(v) => {
                set('haptics', v)
                if (v && typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12)
              }}
            />
            <ToggleRow
              label="Voice guide"
              hint="Browser speech reads a short intro, the summary, and record highs and lows. Off by default; captions still describe every month."
              checked={settings.voiceGuide}
              onChange={(v) => set('voiceGuide', v)}
            />
            {settings.voiceGuide && (
              <div className="mt-2.5 rounded border border-ivory/15 bg-black/40 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="pt-voice-select" className="font-ui text-[12.5px] font-medium text-ivory">
                    Voice Narrator
                  </label>
                  <button
                    type="button"
                    onClick={() => speak('Welcome to Prism Tone. This is the natural narration voice.', { volume: state.volume ?? 1, voiceURI: settings.voiceURI })}
                    className="border border-ivory/25 bg-ivory/10 px-2 py-0.5 font-ui text-[11.5px] text-cream hover:border-ivory/60 hover:bg-ivory/20 hover:text-ivory transition-colors cursor-pointer"
                  >
                    ▶ Test Voice
                  </button>
                </div>
                {voices.length > 0 ? (
                  <>
                    <select
                      id="pt-voice-select"
                      value={settings.voiceURI || ''}
                      onChange={(e) => set('voiceURI', e.target.value)}
                      className="w-full border border-ivory/20 bg-coal/90 px-2 py-1.5 font-ui text-[12.5px] text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory cursor-pointer"
                    >
                      <option value="">Auto: Best Natural / Offline Voice (Recommended)</option>
                      {voices.map((v) => {
                        const isNatural = /natural|neural|online|google|enhanced|premium/i.test(v.name)
                        const isOffline = Boolean(v.localService || /zira|david|sapi|desktop/i.test(v.name))
                        return (
                          <option key={v.voiceURI || v.name} value={v.voiceURI || v.name}>
                            {isNatural ? '★ ' : ''}{v.name} ({v.lang}){isOffline ? ' · Offline' : ''}
                          </option>
                        )
                      })}
                    </select>
                    {isBraveBrowser() && (
                      <p className="font-ui text-[11px] text-amber-200/90 leading-relaxed">
                        Tip for Brave: Shields can block Google cloud voices. Auto selects local offline voices (e.g. Microsoft Zira) for reliable playback.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="font-ui text-[11.5px] text-beige">
                    Using browser default voice.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* shortcuts */}
          <section aria-labelledby="pt-keys-title" className="mt-6 border-t border-ivory/10 pt-5">
            <h3 id="pt-keys-title" className="font-stencil text-[12px] uppercase tracking-[0.2em] text-beige">
              Keyboard
            </h3>
            <dl className="mt-2 divide-y divide-ivory/10">
              {SHORTCUTS.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-4 py-2">
                  <dt>
                    <kbd className="inline-block min-w-[42px] border border-ivory/25 bg-white/[0.04] px-2 py-1 text-center font-data text-[13px] text-ivory">
                      {key}
                    </kbd>
                  </dt>
                  <dd className="flex-1 text-right font-ui text-[14px] text-cream">{label}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ivory/10 pt-5">
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'RESET_SETTINGS' })
                actions.announce('Display settings reset to their defaults.')
              }}
              className="border border-ivory/25 px-3.5 py-2 font-ui text-[14px] text-cream transition-colors hover:border-ivory/55 hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
            >
              Reset to defaults
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'TOGGLE_SETTINGS', open: false })}
              className="border border-ivory/40 bg-ivory/15 px-4 py-2 font-ui text-[14px] font-semibold text-ivory transition-colors hover:bg-ivory hover:text-[#121313] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory"
            >
              Done
            </button>
          </div>

          <p className="mt-4 font-ui text-[13px] leading-relaxed text-beige">
            Settings stay on this device. No preference is sent anywhere.
          </p>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <div className="mt-3 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-ui text-[15px] text-ivory">{label}</p>
        <p className="mt-0.5 font-ui text-[13px] leading-relaxed text-beige">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory ${checked ? 'border-ember bg-ember/80' : 'border-ivory/30 bg-white/10'
          }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-ivory transition-all duration-150 ${checked ? 'left-[26px]' : 'left-0.5'
            }`}
        />
      </button>
    </div>
  )
}

/** Compact, always-available trigger sitting beside the guide button. */
export function SettingsTrigger() {
  const { state, dispatch } = usePreview()
  return (
    <button
      type="button"
      onClick={() => dispatch({ type: 'TOGGLE_SETTINGS', open: true })}
      aria-label="Open display and accessibility settings"
      title="Display & access (text size, contrast, motion, haptics)"
      aria-expanded={state.settingsOpen}
      className="fixed bottom-6 right-[4.65rem] z-40 flex h-11 items-center gap-2 rounded-full border border-ivory/25 bg-[#161818]/95 px-3.5 text-ivory shadow-lg shadow-black/60 transition-colors duration-200 hover:border-ivory/70 hover:bg-ivory/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory active:scale-95"
    >
      <span aria-hidden="true" className="font-data text-[16px] leading-none">
        Aa
      </span>
      <span className="hidden font-ui text-[13px] sm:inline">Display</span>
    </button>
  )
}
