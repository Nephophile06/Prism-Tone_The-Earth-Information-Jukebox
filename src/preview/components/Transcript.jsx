/**
 * Session transcript content.
 *
 * Every caption the page has spoken this visit, in order, with the moment it
 * was generated. Rendered inside the graph panel’s Transcript tab; copy and
 * download produce a plain-text file of exactly what is listed — nothing is
 * reconstructed or invented.
 */

import { memo, useState, useEffect } from 'react'
import { usePreview } from '../state/PreviewContext'
import { fmtValue, fmtDelta } from '../lib/format'
import { BASELINE } from '../data/datasets'
import { cancelSpeech, isSpeechSupported, pauseSpeech, resumeSpeech, speak } from '../lib/speech'

function clock(ms) {
  try {
    return new Date(ms).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ''
  }
}

function lineFor(entry) {
  const decimals = Number.isFinite(entry.decimals) ? entry.decimals : 1
  const value = entry.value !== null && entry.value !== undefined
    ? ` · ${fmtValue(entry.value, decimals)} ${entry.unit || ''}`.trimEnd()
    : ''
  const delta = entry.delta !== null && entry.delta !== undefined
    ? ` · ${fmtDelta(entry.delta, decimals, entry.unit || '')} vs ${BASELINE.start}–${BASELINE.end}`
    : ''
  return `[${clock(entry.at)}] ${entry.variable}${entry.label ? ` — ${entry.label}` : ''}${value}${delta}\n${entry.text}\n`
}

function Transcript() {
  const { state, dispatch, actions } = usePreview()
  const entries = state.transcript || []
  const [copied, setCopied] = useState('')
  const [voiceState, setVoiceState] = useState('idle') // 'idle' | 'playing' | 'paused'

  // Clean up speech when unmounting or if transcript is cleared
  useEffect(() => {
    return () => {
      cancelSpeech()
    }
  }, [])

  useEffect(() => {
    if (entries.length === 0 && voiceState !== 'idle') {
      cancelSpeech()
      setVoiceState('idle')
    }
  }, [entries.length, voiceState])

  const handleToggleVoice = () => {
    if (!isSpeechSupported()) {
      actions.announce('Speech synthesis is not supported in this browser.')
      return
    }

    if (voiceState === 'paused') {
      resumeSpeech()
      setVoiceState('playing')
      actions.announce('Resumed transcript narration.')
      return
    }

    if (voiceState === 'playing') {
      pauseSpeech()
      setVoiceState('paused')
      actions.announce('Paused transcript narration.')
      return
    }

    // Start fresh speech
    if (entries.length === 0) {
      actions.announce('No captions have been recorded yet this session.')
      return
    }

    const spokenText = `Session transcript with ${entries.length} caption${entries.length === 1 ? '' : 's'}. ` +
      entries.map((e, idx) => {
        const timePart = e.label || clock(e.at)
        const valPart = e.value !== null && e.value !== undefined
          ? `, ${fmtValue(e.value, Number.isFinite(e.decimals) ? e.decimals : 1)} ${e.unit || ''}`
          : ''
        return `Entry ${idx + 1}: ${timePart}${valPart}. ${e.text}`
      }).join(' ')

    const started = speak(spokenText, {
      volume: Math.min(1, Math.max(0.1, Number(state.volume) || 1)),
      voiceURI: state.settings?.voiceURI,
      onStart: () => setVoiceState('playing'),
      onEnd: () => setVoiceState('idle'),
      onError: () => setVoiceState('idle'),
    })

    if (started) {
      setVoiceState('playing')
      actions.announce('Reading transcript aloud.')
    }
  }

  const handleStopVoice = () => {
    cancelSpeech()
    setVoiceState('idle')
    actions.announce('Stopped transcript narration.')
  }

  const plain = () => entries.map(lineFor).join('\n')

  const copy = async () => {
    const text = plain()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied('Copied')
      actions.announce('Transcript copied to the clipboard.')
    } catch {
      setCopied('Copy failed — use download')
      actions.announce('Clipboard access was blocked. Use the download button instead.')
    }
    window.setTimeout(() => setCopied(''), 4000)
  }

  const download = () => {
    const text = plain()
    if (!text) return
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prism-tone-captions-${new Date().toISOString().slice(0, 10)}.txt`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      actions.announce('Transcript downloaded as a text file.')
    } catch {
      actions.announce('The download could not be created in this browser.')
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 mb-2.5">
        <p className="font-ui text-[14px] text-cream">
          {entries.length === 0
            ? 'No captions yet this session'
            : `${entries.length} caption${entries.length === 1 ? '' : 's'} this session`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {copied && (
            <span className="font-ui text-[13px] text-cream">{copied}</span>
          )}

          {/* Voice Narration: Play/Pause */}
          <button
            type="button"
            onClick={handleToggleVoice}
            disabled={entries.length === 0}
            aria-label={
              voiceState === 'playing'
                ? 'Pause transcript voice narration'
                : voiceState === 'paused'
                  ? 'Resume transcript voice narration'
                  : 'Play transcript voice narration'
            }
            title={
              entries.length === 0
                ? 'No captions to read'
                : voiceState === 'playing'
                  ? 'Pause voice'
                  : voiceState === 'paused'
                    ? 'Resume voice'
                    : 'Listen to transcript with voice'
            }
            className={`min-h-[34px] inline-flex items-center gap-1.5 border px-3 py-1 font-ui text-[13px] font-medium transition-all ${
              voiceState === 'playing'
                ? 'border-ember bg-ember/20 text-ivory hover:bg-ember/30'
                : voiceState === 'paused'
                  ? 'border-amber-400/80 bg-amber-950/40 text-amber-200 hover:bg-amber-900/50'
                  : 'border-ivory/25 text-ivory hover:border-ivory/60 hover:bg-white/5'
            } disabled:cursor-not-allowed disabled:border-ivory/10 disabled:text-beige focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory cursor-pointer`}
          >
            {voiceState === 'playing' ? (
              <>
                <span className="flex items-center gap-0.5" aria-hidden="true">
                  <span className="h-2.5 w-0.5 animate-pulse bg-ember" />
                  <span className="h-3.5 w-0.5 animate-pulse bg-ember" />
                  <span className="h-2 w-0.5 animate-pulse bg-ember" />
                </span>
                <span>Pause voice</span>
              </>
            ) : voiceState === 'paused' ? (
              <>
                <svg width="8" height="9" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
                  <path d="M1 1 L9 6 L1 11 Z" />
                </svg>
                <span>Resume</span>
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
                <span>Play voice</span>
              </>
            )}
          </button>

          {/* Voice Narration: Stop */}
          <button
            type="button"
            onClick={handleStopVoice}
            disabled={voiceState === 'idle'}
            aria-label="Stop transcript voice narration"
            title="Stop voice"
            className={`min-h-[34px] inline-flex items-center gap-1.5 border px-3 py-1 font-ui text-[13px] font-medium transition-all ${
              voiceState !== 'idle'
                ? 'border-red-500/70 bg-red-950/40 text-red-200 hover:border-red-400 hover:bg-red-900/50 cursor-pointer shadow-sm'
                : 'border-ivory/20 bg-ivory/5 text-cream/40 cursor-not-allowed opacity-50'
            } focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory`}
          >
            <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true" fill="currentColor">
              <rect width="10" height="10" rx="1" />
            </svg>
            <span>Stop</span>
          </button>

          <button
            type="button"
            onClick={copy}
            disabled={entries.length === 0}
            className="min-h-[34px] border border-ivory/25 px-3 py-1 font-ui text-[13px] text-ivory transition-colors hover:border-ivory/60 hover:bg-white/5 disabled:cursor-not-allowed disabled:border-ivory/10 disabled:text-beige focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory cursor-pointer"
          >
            Copy text
          </button>
          <button
            type="button"
            onClick={download}
            disabled={entries.length === 0}
            className="min-h-[34px] border border-ivory/25 px-3 py-1 font-ui text-[13px] text-ivory transition-colors hover:border-ivory/60 hover:bg-white/5 disabled:cursor-not-allowed disabled:border-ivory/10 disabled:text-beige focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory cursor-pointer"
          >
            Download .txt
          </button>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={() => {
                cancelSpeech()
                setVoiceState('idle')
                dispatch({ type: 'CLEAR_TRANSCRIPT' })
                actions.announce('Transcript cleared.')
              }}
              className="min-h-[34px] border border-transparent px-2 py-1 font-ui text-[13px] text-cream transition-colors hover:text-ivory focus-visible:outline focus-visible:outline-2 focus-visible:outline-ivory cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div
        className="h-[275px] sm:h-[295px] md:h-[315px] lg:h-[335px] overflow-y-auto border-t border-b border-ivory/10 pr-1.5 data-tracks-scroll"
        data-lenis-prevent
      >
        {entries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <p className="font-ui text-[14.5px] leading-relaxed text-cream max-w-md">
              Captions appear here as the record is explored — one entry per sounding month or selected period.
              Press play, move through the timeline, or change the selection to begin.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-ivory/10" aria-label="Captions in chronological order">
            {entries.map((entry) => (
              <li key={entry.id} className="py-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <time dateTime={new Date(entry.at).toISOString()} className="font-data text-[13px] text-beige">
                    {clock(entry.at)}
                  </time>
                  <span className="font-ui text-[14px] font-semibold text-ivory">
                    {entry.variable}
                    {entry.label ? ` · ${entry.label}` : ''}
                  </span>
                  {entry.value !== null && entry.value !== undefined && (
                    <span className="font-data text-[14px] text-cream">
                      {fmtValue(entry.value, Number.isFinite(entry.decimals) ? entry.decimals : 1)} {entry.unit || ''}
                      {entry.delta !== null && entry.delta !== undefined
                        ? ` (${fmtDelta(entry.delta, Number.isFinite(entry.decimals) ? entry.decimals : 1, entry.unit || '')})`
                        : ''}
                    </span>
                  )}
                </div>
                <p className="mt-1 max-w-[75ch] font-ui text-[14.5px] leading-relaxed text-cream">{entry.text}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className="mt-2.5 shrink-0 font-ui text-[12.5px] leading-relaxed text-cream">
        Generated from the loaded NASA POWER record during this visit only. Nothing is stored on a server and
        nothing is added after the fact.
      </p>
    </div>
  )
}

export default memo(Transcript)
