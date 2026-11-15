/**
 * One shared frame for every preview panel.
 *
 * A panel is exactly one border: the header carries the title, optional meta
 * and an actions slot; the body holds content. Inner groups use dividers and
 * spacing, never nested bordered boxes, so the page reads as one consistent
 * surface instead of a stack of cards.
 */

import { memo } from 'react'

function Panel({ title, meta, actions, children, className = '' }) {
  return (
    <section className={`flex h-full flex-col border border-ivory/15 bg-coal/50 ${className}`}>
      {(title || meta || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-ivory/10 px-3.5 py-2 md:px-4 md:py-2.5">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            {title && (
              <h2 className="font-stencil text-[11.5px] uppercase tracking-[0.18em] text-beige">{title}</h2>
            )}
            {meta && <span className="font-ui text-[12px] text-cream">{meta}</span>}
          </div>
          {actions}
        </div>
      )}
      <div className="flex-1 flex flex-col min-h-0 p-3 md:p-3.5">{children}</div>
    </section>
  )
}

export default memo(Panel)
