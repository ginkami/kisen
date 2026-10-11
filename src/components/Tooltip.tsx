import { useRef, useState, type ReactNode } from 'react'
import {
  FloatingArrow,
  FloatingPortal,
  arrow,
  autoUpdate,
  flip,
  hide,
  offset,
  safePolygon,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react'
import type { Placement } from '@floating-ui/react'

export type TooltipVariant = 'neutral' | 'secondary'

interface TooltipProps {
  /**
   * Bubble content. A string renders a compact centred text bubble
   * (daisyUI `data-tip` parity); rich JSX keeps its own padding/typography
   * (daisyUI `.tooltip-content` parity).
   */
  content: ReactNode
  /** Preferred side of the trigger; the bubble flips/shifts automatically when it would clip. */
  placement?: Placement
  /** Keep the bubble open while the pointer moves over it (interactive cards). */
  interactive?: boolean
  /** Bubble colour scheme (daisyUI tooltip colour variants). */
  variant?: TooltipVariant
  /** Extra classes for the trigger wrapper (layout/stacking — the bubble is portaled, no positioning needed here). */
  className?: string
  children: ReactNode
}

/**
 * Hover/focus tooltip built on @floating-ui/react, replacing the daisyUI CSS
 * `.tooltip` / `data-tip` / `.tooltip-content` mechanism. The bubble renders in
 * a portal on `document.body`, so it is never clipped by table scroll
 * containers, `overflow-hidden` cells, or stacking contexts.
 */
export function Tooltip({
  content,
  placement = 'top',
  interactive = false,
  variant = 'neutral',
  className,
  children,
}: TooltipProps) {
  const [open, setOpen] = useState(false)
  const arrowRef = useRef<SVGSVGElement>(null)

  const { refs, context, floatingStyles, middlewareData } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      // eslint-disable-next-line react-hooks/refs -- floating-ui reads the arrow element after mount, not during render
      arrow({ element: arrowRef, padding: 4 }),
      hide({ padding: 8 }),
    ],
  })

  const hover = useHover(context, { handleClose: interactive ? safePolygon() : undefined })
  const focus = useFocus(context)
  const dismiss = useDismiss(context)
  const role = useRole(context, { role: 'tooltip' })
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role])

  const referenceHidden = middlewareData.hide?.referenceHidden as boolean | undefined
  const isText = typeof content === 'string'
  const bg = variant === 'secondary' ? 'bg-secondary' : 'bg-neutral'
  const fg = variant === 'secondary' ? 'text-secondary-content' : 'text-neutral-content'
  const arrowFill = variant === 'secondary' ? 'var(--color-secondary)' : 'var(--color-neutral)'

  return (
    <>
      <span ref={refs.setReference} className={className} {...getReferenceProps()}>
        {children}
      </span>
      {open && (
        <FloatingPortal>
          <div
            // eslint-disable-next-line react-hooks/refs -- floating-ui assigns this callback ref after mount
            ref={refs.setFloating}
            className={[
              'z-[100] rounded-lg shadow-lg motion-safe:animate-[tooltip-in_0.15s_ease-out]',
              bg,
              fg,
              // Text bubbles mirror daisyUI's `data-tip` sizing; rich content
              // supplies its own padding and typography.
              isText && 'w-max max-w-[20rem] px-2 py-1 text-center text-sm leading-tight',
              !interactive && 'pointer-events-none',
              referenceHidden && 'invisible',
            ]
              .filter(Boolean)
              .join(' ')}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            {content}
            <FloatingArrow
              ref={arrowRef}
              context={context}
              width={10}
              height={5}
              fill={arrowFill}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
