import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { usePreview } from '../state/PreviewContext'

export default function Toast() {
  const { state, dispatch } = usePreview()
  const toast = state.toast

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      dispatch({ type: 'HIDE_TOAST' })
    }, 3800)
    return () => clearTimeout(timer)
  }, [toast?.id, dispatch])

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -18, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-center gap-3 rounded-lg border border-ember/70 bg-[#141618]/95 px-4 py-3 text-ivory shadow-2xl shadow-black/90 backdrop-blur-md"
          role="status"
          aria-live="polite"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ember/20 text-ember" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <p className="font-ui text-[13.5px] font-medium text-ivory tracking-wide">
            {toast.message}
          </p>
          <button
            type="button"
            onClick={() => dispatch({ type: 'HIDE_TOAST' })}
            className="ml-2 text-cream/60 hover:text-ivory transition-colors cursor-pointer"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
