/**
 * Opt-in spoken narration (Web Speech API).
 *
 * This is the Voice guide channel, separate from the polite live region in
 * the app. It speaks only when the listener has switched Voice guide on:
 * a short intro, the selection summary, and record highs and lows. Per-month
 * captions and image descriptions stay on the live-region / announce path and
 * are never spoken here.
 *
 * Every utterance is clamped and cancelled before it starts, so a new
 * sentence never queues behind an old one. If the browser has no speech
 * synthesis, every export silently does nothing.
 */

let currentUtterance = null
let keepAliveTimer = null

// Guard against V8 garbage collection mid-speech (Chromium bug 753177)
if (typeof window !== 'undefined' && !window.__pt_speech_utterances) {
  window.__pt_speech_utterances = new Set()
}

function startKeepAlive() {
  stopKeepAlive()
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  keepAliveTimer = setInterval(() => {
    if (!currentUtterance) {
      stopKeepAlive()
      return
    }
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume()
      }
    } catch {
      /* ignore */
    }
  }, 5000)
}

function stopKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer)
    keepAliveTimer = null
  }
}

/**
 * Detects if the current environment is the Brave browser.
 * Brave Shields block Google Cloud TTS network endpoints (used by 'Google US English'),
 * which causes speech to fail silently or timeout unless local offline voices are used.
 */
export function isBraveBrowser() {
  if (typeof navigator === 'undefined') return false
  try {
    return Boolean(
      (navigator.brave && typeof navigator.brave === 'object') ||
      (navigator.userAgent && /brave/i.test(navigator.userAgent))
    )
  } catch {
    return false
  }
}

export function isSpeechSupported() {
  return typeof window !== 'undefined'
    && Boolean(window.speechSynthesis)
    && typeof window.SpeechSynthesisUtterance === 'function'
}

/** True from the moment an utterance is handed to the browser until it ends. */
export function isSpeaking() {
  return currentUtterance !== null
}

export function cancelSpeech() {
  stopKeepAlive()
  currentUtterance = null
  if (!isSpeechSupported()) return
  try {
    window.speechSynthesis.cancel()
    if (typeof window !== 'undefined' && window.__pt_speech_utterances) {
      window.__pt_speech_utterances.clear()
    }
  } catch {
    /* nothing to cancel or the engine is unavailable */
  }
}

export function pauseSpeech() {
  if (!isSpeechSupported()) return
  try {
    window.speechSynthesis.pause()
  } catch {
    /* ignore */
  }
}

export function resumeSpeech() {
  if (!isSpeechSupported()) return
  try {
    window.speechSynthesis.resume()
  } catch {
    /* ignore */
  }
}

/**
 * Returns available voices from the browser, filtering for English voices.
 */
export function getAvailableVoices() {
  if (!isSpeechSupported()) return []
  try {
    const synth = window.speechSynthesis
    if (typeof synth.getVoices !== 'function') return []
    const all = synth.getVoices()
    if (!Array.isArray(all)) return []
    return all.filter((v) => v && v.lang && v.lang.toLowerCase().startsWith('en'))
  } catch {
    return []
  }
}

/**
 * Resolves the most natural-sounding human voice available in the browser.
 * In Brave, local offline voices (e.g. Microsoft Zira / localService: true) are
 * prioritized over Google Cloud TTS voices, which Brave Shields block by default.
 */
export function getBestVoice(preferredURI = '') {
  if (!isSpeechSupported()) return null
  try {
    const synth = window.speechSynthesis
    if (!synth || typeof synth.getVoices !== 'function') return null
    const voices = synth.getVoices()
    if (!Array.isArray(voices) || voices.length === 0) return null

    const inBrave = isBraveBrowser()

    // If a specific preferred voice was chosen
    if (preferredURI) {
      const matched = voices.find(
        (v) => (v.voiceURI && v.voiceURI === preferredURI) || v.name === preferredURI
      )
      if (matched) return matched
    }

    // In Brave: Shields block external network calls to Google's cloud TTS servers.
    // We prioritize local offline voices (Microsoft Zira, localService: true, Apple local)
    // so narration works seamlessly without shield interference.
    if (inBrave) {
      const localZira = voices.find((v) => /zira/i.test(v.name))
      if (localZira) return localZira

      const localServiceVoice = voices.find(
        (v) => (v.lang.startsWith('en') || v.lang === 'en-US') && v.localService === true && !/david|mark desktop/i.test(v.name)
      )
      if (localServiceVoice) return localServiceVoice

      const appleLocal = voices.find(
        (v) => (v.lang.startsWith('en') || v.lang === 'en-US') &&
               /samantha|serena|karen|daniel|siri/i.test(v.name)
      )
      if (appleLocal) return appleLocal

      const nonGoogle = voices.find(
        (v) => (v.lang.startsWith('en') || v.lang === 'en-US') && !/google/i.test(v.name)
      )
      if (nonGoogle) return nonGoogle
    }

    // 1. Top priority: Azure / Edge Online Natural voices (Jenny, Aria, Guy, Ava)
    const naturalJennyAria = voices.find(
      (v) => (v.lang.startsWith('en') || v.lang === 'en-US') &&
             /jenny|aria|guy|ava|andrew/i.test(v.name) &&
             /natural|online/i.test(v.name)
    )
    if (naturalJennyAria) return naturalJennyAria

    // 2. Any voice explicitly marked Natural or Neural
    const naturalAny = voices.find(
      (v) => (v.lang.startsWith('en') || v.lang === 'en-US') && /natural|neural|online/i.test(v.name)
    )
    if (naturalAny) return naturalAny

    // 3. Google Voices in Chrome (if NOT Brave)
    if (!inBrave) {
      const googleUs = voices.find(
        (v) => /google/i.test(v.name) && (/us english/i.test(v.name) || /uk english female/i.test(v.name))
      )
      if (googleUs) return googleUs

      const googleAny = voices.find(
        (v) => (v.lang.startsWith('en') || v.lang === 'en-US') && /google/i.test(v.name)
      )
      if (googleAny) return googleAny
    }

    // 4. Apple Enhanced / Premium voices (macOS / iOS)
    const appleEnhanced = voices.find(
      (v) => (v.lang.startsWith('en') || v.lang === 'en-US') &&
             /enhanced|premium|siri|samantha|serena|karen|daniel/i.test(v.name)
    )
    if (appleEnhanced) return appleEnhanced

    // 5. Windows Zira (smooth and clear)
    const zira = voices.find((v) => /zira/i.test(v.name))
    if (zira) return zira

    // 6. Any English voice that is NOT legacy robotic David or Mark
    const nonDavid = voices.find(
      (v) => (v.lang.startsWith('en') || v.lang === 'en-US') && !/david|mark desktop/i.test(v.name)
    )
    if (nonDavid) return nonDavid

    // 7. Fallback en-US or any English
    return voices.find((v) => v.lang === 'en-US') || voices.find((v) => v.lang.startsWith('en')) || voices[0] || null
  } catch {
    return null
  }
}

/** Pre-cache voices when the browser fires onvoiceschanged */
if (typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined') {
  try {
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        getBestVoice()
      })
    } else if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        getBestVoice()
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} text
 * @param {{ volume?: number, voiceURI?: string, onStart?: () => void, onEnd?: () => void, onError?: (err?: any) => void }} options
 * @returns {boolean} whether an utterance was started
 */
export function speak(text, { volume = 1, voiceURI = '', onStart, onEnd, onError } = {}) {
  if (!text || !isSpeechSupported()) return false
  const level = Math.min(1, Math.max(0, Number(volume)))
  if (!(level > 0)) return false

  try {
    const synth = window.speechSynthesis
    synth.cancel()
    currentUtterance = null

    const utterance = new window.SpeechSynthesisUtterance(String(text))
    const voice = getBestVoice(voiceURI)
    if (voice) {
      utterance.voice = voice
      utterance.lang = voice.lang || 'en-US'
    } else {
      utterance.lang = 'en-US'
    }

    // Natural pacing and pitch for clear, documentary-style narration
    utterance.rate = 0.96
    utterance.pitch = 1.02
    utterance.volume = level
    currentUtterance = utterance

    // Prevent V8 garbage collection mid-speech (Chromium bug 753177)
    if (typeof window !== 'undefined' && window.__pt_speech_utterances) {
      window.__pt_speech_utterances.add(utterance)
    }

    const release = (err) => {
      stopKeepAlive()
      if (typeof window !== 'undefined' && window.__pt_speech_utterances) {
        window.__pt_speech_utterances.delete(utterance)
      }
      if (currentUtterance === utterance) currentUtterance = null
      if (err) {
        if (typeof onError === 'function') onError(err)
      } else {
        if (typeof onEnd === 'function') onEnd()
      }
    }

    utterance.onstart = () => {
      startKeepAlive()
      if (typeof onStart === 'function') onStart()
    }
    utterance.onend = () => release(null)
    utterance.onerror = (e) => {
      // In Brave or when shields block cloud voices, error is often 'network'
      // If we failed with a remote cloud voice, try once immediately with a local offline voice
      if (e && e.error === 'network' && voice && !voice.localService) {
        try {
          const localFallback = getAvailableVoices().find((v) => v.localService) ||
            getAvailableVoices().find((v) => /zira|david/i.test(v.name))
          if (localFallback && localFallback.voiceURI !== voice.voiceURI) {
            release(null)
            speak(text, { volume: level, voiceURI: localFallback.voiceURI, onStart, onEnd, onError })
            return
          }
        } catch {
          /* ignore fallback error */
        }
      }
      release(e)
    }

    /* Chrome/Brave can be left paused after cancel(); resume before speaking so the
       first sentence is not swallowed. */
    try {
      synth.resume()
    } catch {
      /* not paused */
    }
    synth.speak(utterance)
    return true
  } catch {
    currentUtterance = null
    stopKeepAlive()
    return false
  }
}

export const MILESTONE_THROTTLE_MS = 12000

/**
 * The record high or low that a step represents, if any. A flat selection
 * (min === max) has no milestone, and comparison uses an epsilon so values
 * that came from the same series entry always match.
 */
export function milestoneFor(value, extremes, epsilon = 1e-9) {
  if (!Number.isFinite(value) || !extremes) return null
  const { min, max } = extremes
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null
  if (Math.abs(max - min) < epsilon) return null
  if (Math.abs(value - max) < epsilon) return { kind: 'high', value }
  if (Math.abs(value - min) < epsilon) return { kind: 'low', value }
  return null
}

/**
 * Per-selection guard: one callout per record value, and at most one callout
 * every `throttleMs`. Reset it for a new selection or a fresh Play.
 */
export function createMilestoneGate(throttleMs = MILESTONE_THROTTLE_MS) {
  let spoken = new Set()
  let lastAt = 0

  return {
    reset() {
      spoken = new Set()
      lastAt = 0
    },
    shouldSpeak(milestone, stepKey, now = Date.now()) {
      if (!milestone || !stepKey) return false
      const key = `${milestone.kind}:${stepKey}`
      if (spoken.has(key)) return false
      if (lastAt && now - lastAt < throttleMs) return false
      spoken.add(key)
      lastAt = now
      return true
    },
  }
}
