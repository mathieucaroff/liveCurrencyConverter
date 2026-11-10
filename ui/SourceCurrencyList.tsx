import { useEffect, useMemo, useState } from 'react'

import {
  CURRENCIES,
  CURRENCIES_BY_WEALTH,
  resolveTokenOwnership,
  type TokenClaim,
} from '~/lib/currencies'
import { CurrencyLabel, CurrencyMenu } from '~/ui/CurrencyPicker'
import { Dropdown } from '~/ui/Dropdown'

const ALL_CODES = CURRENCIES.map((currency) => currency.code).sort()

type SourceCurrencyListProps = {
  codes: string[]
  home: string
  onChange: (codes: string[]) => void
  /** Tailwind max-height class of the scrolling list. */
  listClassName: string
}

function TokenChip({ claim, code }: { claim: TokenClaim; code: string }) {
  if (claim.owner === code) {
    return (
      <span
        title={`"${claim.token}" is detected as ${code}`}
        className={`rounded-md border border-amber-400/30 bg-amber-400/15 px-1.5 py-0.5 text-xs text-amber-100 ${
          claim.kind === 'code' ? 'font-mono' : ''
        }`}
      >
        {claim.token}
      </span>
    )
  }

  return (
    <span
      title={`"${claim.token}" is detected as ${claim.owner}, which is higher in the list`}
      className="rounded-md border border-white/5 bg-black/20 px-1.5 py-0.5 text-xs text-stone-500"
    >
      <span className="line-through">{claim.token}</span>
      <span className="ml-1 font-mono text-[10px]">→ {claim.owner}</span>
    </span>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-sm text-stone-300 transition hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}

/** A destructive button that needs a second click within 3 s to act. */
function DangerButton({
  label,
  onConfirm,
  disabled,
}: {
  label: string
  onConfirm: () => void
  disabled?: boolean
}) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(timer)
  }, [armed])

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else {
          setArmed(true)
        }
      }}
      className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-30 ${
        armed
          ? 'border-red-500 bg-red-500 text-white'
          : 'border-red-400/40 text-red-300 hover:bg-red-500/10 disabled:hover:bg-transparent'
      }`}
    >
      {armed ? 'Click again to confirm' : label}
    </button>
  )
}

export function SourceCurrencyList({
  codes,
  home,
  onChange,
  listClassName,
}: SourceCurrencyListProps) {
  const { claims } = useMemo(() => resolveTokenOwnership(codes), [codes])
  /** Currencies offered by the add menu, frozen while it is open. */
  const [addable, setAddable] = useState<string[]>([])
  const missingCount = CURRENCIES.length - codes.length

  function move(index: number, to: number) {
    const next = [...codes]
    const [item] = next.splice(index, 1)
    next.splice(to, 0, item!)
    onChange(next)
  }

  function toggle(code: string) {
    onChange(
      codes.includes(code) ? codes.filter((c) => c !== code) : [...codes, code],
    )
  }

  /** Tokens a currency would lose if added at the bottom of the list. */
  function conflictHint(code: string) {
    if (codes.includes(code)) return 'Added at the bottom of the list'
    const lost =
      resolveTokenOwnership([...codes, code])
        .claims.get(code)
        ?.filter((claim) => claim.owner !== code) ?? []
    if (lost.length === 0) return null
    const shown = lost
      .slice(0, 3)
      .map((claim) => `${claim.token} → ${claim.owner}`)
      .join(', ')
    return `Already used: ${shown}${lost.length > 3 ? ', …' : ''}`
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <DangerButton
          label="Add all currencies"
          disabled={missingCount === 0}
          onConfirm={() =>
            onChange([
              ...codes,
              ...CURRENCIES_BY_WEALTH.filter((code) => !codes.includes(code)),
            ])
          }
        />
        <DangerButton
          label="Remove all currencies"
          disabled={codes.length === 0}
          onConfirm={() => onChange([])}
        />
      </div>

      {codes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-stone-400">
          No source currency: nothing will be converted.
        </p>
      ) : (
        <ol className={`space-y-2 overflow-y-auto pr-1 ${listClassName}`}>
          {codes.map((code, index) => {
            const isHome = code === home
            return (
              <li
                key={code}
                className={`space-y-2 rounded-xl border p-3 ${
                  isHome
                    ? 'border-amber-400/30 bg-amber-400/5'
                    : 'border-white/10 bg-black/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-white/10 px-1 text-[11px] font-semibold text-stone-300">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <CurrencyLabel code={code} />
                  </div>
                  <div className="flex shrink-0">
                    <IconButton
                      label={`Move ${code} to the top`}
                      disabled={index === 0}
                      onClick={() => move(index, 0)}
                    >
                      ⤒
                    </IconButton>
                    <IconButton
                      label={`Move ${code} up`}
                      disabled={index === 0}
                      onClick={() => move(index, index - 1)}
                    >
                      ↑
                    </IconButton>
                    <IconButton
                      label={`Move ${code} down`}
                      disabled={index === codes.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      ↓
                    </IconButton>
                    <IconButton
                      label={`Remove ${code}`}
                      onClick={() => toggle(code)}
                    >
                      ✕
                    </IconButton>
                  </div>
                </div>
                {isHome && (
                  <p
                    className="pl-7 text-xs text-amber-200/80"
                    title="Prices in your home currency keep their symbols but are not converted"
                  >
                    ⌂ Home currency · detected, not converted
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 pl-7">
                  {claims.get(code)?.map((claim) => (
                    <TokenChip key={claim.token} claim={claim} code={code} />
                  ))}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <Dropdown
        onOpen={() =>
          setAddable(ALL_CODES.filter((code) => !codes.includes(code)))
        }
        trigger={({ open, toggle: toggleMenu }) => (
          <button
            type="button"
            disabled={missingCount === 0}
            onClick={toggleMenu}
            aria-expanded={open}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-2 text-sm text-stone-200 transition hover:border-amber-400/60 hover:bg-white/5 disabled:opacity-40 disabled:hover:border-white/20 disabled:hover:bg-transparent"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              +
            </span>
            {missingCount === 0
              ? 'All currencies are listed'
              : 'Add source currencies'}
          </button>
        )}
      >
        {(close) => (
          <div className="space-y-2">
            <CurrencyMenu
              placeholder="Search by code, name or symbol"
              sections={[{ codes: addable }]}
              isChecked={(code) => codes.includes(code)}
              hint={conflictHint}
              onPick={toggle}
            />
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-xs text-stone-500">
                Click to add or remove; added currencies go to the bottom.
              </p>
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-lg bg-amber-400 px-3 py-1 text-xs font-semibold text-stone-950 transition hover:bg-amber-300"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Dropdown>
    </div>
  )
}
