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
  currentUtterance = null
  if (!isSpeechSupported()) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* nothing to cancel or the engine is unavailable */
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
 * Modern browsers (Edge, Chrome, Safari) include high-fidelity Neural/Natural
 * voices (e.g. Microsoft Jenny/Aria Natural, Google US English, Apple Enhanced).
 * This function prioritizes those and explicitly avoids legacy robotic SAPI voices
 * (such as Microsoft David).
 */
export function getBestVoice(preferredURI = '') {
  if (!isSpeechSupported()) return null
  try {
    const synth = window.speechSynthesis
    if (!synth || typeof synth.getVoices !== 'function') return null
    const voices = synth.getVoices()
    if (!Array.isArray(voices) || voices.length === 0) return null

    // If a specific preferred voice was chosen
    if (preferredURI) {
      const matched = voices.find(
        (v) => (v.voiceURI && v.voiceURI === preferredURI) || v.name === preferredURI
      )
      if (matched) return matched
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

    // 3. Google Voices in Chrome ("Google US English", "Google UK English Female")
    const googleUs = voices.find(
      (v) => /google/i.test(v.name) && (/us english/i.test(v.name) || /uk english female/i.test(v.name))
    )
    if (googleUs) return googleUs

    const googleAny = voices.find(
      (v) => (v.lang.startsWith('en') || v.lang === 'en-US') && /google/i.test(v.name)
    )
    if (googleAny) return googleAny

    // 4. Apple Enhanced / Premium voices (macOS / iOS)
    const appleEnhanced = voices.find(
      (v) => (v.lang.startsWith('en') || v.lang === 'en-US') &&
             /enhanced|premium|siri|samantha|serena|karen|daniel/i.test(v.name)
    )
    if (appleEnhanced) return appleEnhanced

    // 5. Windows Zira (much smoother and warmer than robotic David)
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
 * @param {{ volume?: number, voiceURI?: string }} options
 * @returns {boolean} whether an utterance was started
 */
export function speak(text, { volume = 1, voiceURI = '' } = {}) {
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

    const release = () => {
      if (currentUtterance === utterance) currentUtterance = null
    }
    utterance.onend = release
    utterance.onerror = release

    /* Chrome can be left paused after cancel(); resume before speaking so the
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
