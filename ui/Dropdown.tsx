import { useEffect, useRef, useState, type ReactNode } from 'react'

type DropdownProps = {
  /** The element that opens the menu. */
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  /** Menu content; call `close` to close it. */
  children: (close: () => void) => ReactNode
  onOpen?: () => void
}

/** A menu floating below its trigger; closes on outside click and Escape. */
export function Dropdown({ trigger, children, onOpen }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function toggle() {
    if (!open) onOpen?.()
    setOpen(!open)
  }

  return (
    <div ref={rootRef} className="relative">
      {trigger({ open, toggle })}
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-2xl border border-white/10 bg-stone-900 p-2 shadow-2xl shadow-black/60">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
