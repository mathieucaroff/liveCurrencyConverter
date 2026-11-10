import { useState, type ReactNode } from 'react'

import {
  currencyMatchesQuery,
  currencyName,
  currencySymbol,
} from '~/lib/currencies'

export type PickerSection = { label?: string; codes: string[] }

/** Code, symbol and name of a currency, on one line. */
export function CurrencyLabel({ code }: { code: string }) {
  const symbol = currencySymbol(code)
  return (
    <span className="flex min-w-0 items-baseline gap-2">
      <span className="w-10 shrink-0 font-mono text-sm font-semibold text-stone-100">
        {code}
      </span>
      {symbol !== code && (
        <span className="shrink-0 text-sm text-amber-200/90">{symbol}</span>
      )}
      <span className="truncate text-sm text-stone-400">
        {currencyName(code)}
      </span>
    </span>
  )
}

type CurrencyMenuProps = {
  sections: PickerSection[]
  onPick: (code: string) => void
  placeholder: string
  /** Extra line shown under a currency, e.g. a conflict warning. */
  hint?: (code: string) => ReactNode
  /** Currencies shown with a check mark. */
  isChecked?: (code: string) => boolean
}

/** Search box over a scrollable list of currencies, for use in a dropdown. */
export function CurrencyMenu({
  sections,
  onPick,
  placeholder,
  hint,
  isChecked,
}: CurrencyMenuProps) {
  const [query, setQuery] = useState('')

  const visibleSections = sections
    .map((section) => ({
      ...section,
      codes: section.codes.filter((code) => currencyMatchesQuery(code, query)),
    }))
    .filter((section) => section.codes.length > 0)

  return (
    <div className="space-y-2">
      <input
        type="search"
        value={query}
        autoFocus
        placeholder={placeholder}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-amber-400/60 focus:outline-none"
      />
      <div className="max-h-64 overflow-y-auto rounded-xl">
        {visibleSections.length === 0 && (
          <p className="p-3 text-sm text-stone-500">No matching currency.</p>
        )}
        {visibleSections.map((section, index) => (
          <div key={section.label ?? index}>
            {section.label && (
              <p className="sticky top-0 bg-stone-900 px-3 py-1 text-[11px] font-semibold tracking-wider text-stone-500 uppercase">
                {section.label}
              </p>
            )}
            <ul>
              {section.codes.map((code) => {
                const hintContent = hint?.(code)
                const checked = isChecked?.(code)
                return (
                  <li key={code}>
                    <button
                      type="button"
                      onClick={() => onPick(code)}
                      className={`flex w-full items-start gap-2 rounded-lg px-3 py-1.5 text-left transition hover:bg-white/10 ${
                        checked ? 'bg-amber-400/10' : ''
                      }`}
                    >
                      {isChecked && (
                        <span
                          aria-hidden="true"
                          className="w-3 shrink-0 text-sm text-amber-300"
                        >
                          {checked ? '✓' : ''}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <CurrencyLabel code={code} />
                        {hintContent && (
                          <span className="mt-0.5 block pl-12 text-xs text-stone-500">
                            {hintContent}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
