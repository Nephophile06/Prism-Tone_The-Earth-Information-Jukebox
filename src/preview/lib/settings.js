/** Persisted display and accessibility settings for the Preview page. */

const KEY = 'pt-preview-settings-v2'
const GUIDE_KEY = 'pt-preview-guide-seen-v2'

export const DEFAULT_SETTINGS = {
  captionsVisible: true,
  captionSize: 'm', // s | m | l | xl
  highContrast: false,
  reduceMotion: false,
  haptics: false,
  hoverSonify: true,
  soundMode: 'analysis', // analysis | ambient
}

export const CAPTION_SIZES = {
  s: { px: 20, label: 'S' },
  m: { px: 23, label: 'M' },
  l: { px: 26, label: 'L' },
  xl: { px: 28, label: 'XL' },
}

function prefers(query) {
  try {
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query).matches
      : false
  } catch {
    return false
  }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      // No stored choice yet: honour the operating system's accessibility
      // settings, because the preview's contrast and motion preferences are
      // otherwise only reachable from the settings drawer.
      return {
        ...DEFAULT_SETTINGS,
        reduceMotion: prefers('(prefers-reduced-motion: reduce)'),
        highContrast: prefers('(prefers-contrast: more)'),
      }
    }
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      captionSize: CAPTION_SIZES[parsed.captionSize] ? parsed.captionSize : DEFAULT_SETTINGS.captionSize,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    /* private mode or quota — settings simply do not persist */
  }
}

export function shouldOpenGuide() {
  try {
    return localStorage.getItem(GUIDE_KEY) !== '1'
  } catch {
    return false
  }
}

export function markGuideSeen() {
  try {
    localStorage.setItem(GUIDE_KEY, '1')
  } catch {
    /* storage unavailable — the guide simply appears next time */
  }
}
