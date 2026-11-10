import { useMemo } from 'react'

import { resolveTokenOwnership, type TokenClaim } from '~/lib/currencies'
import { CurrencyLabel } from '~/ui/CurrencyPicker'

type EnabledCurrencyListProps = {
  codes: string[]
  onChange: (codes: string[]) => void
}

function TokenChip({ claim, code }: { claim: TokenClaim; code: string }) {
  const owned = claim.owner === code

  if (owned) {
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

export function EnabledCurrencyList({
  codes,
  onChange,
}: EnabledCurrencyListProps) {
  const { claims } = useMemo(() => resolveTokenOwnership(codes), [codes])

  if (codes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-sm text-stone-400">
        Add a currency below to start converting prices.
      </p>
    )
  }

  function move(index: number, delta: number) {
    const next = [...codes]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item!)
    onChange(next)
  }

  return (
    <ol className="space-y-2">
      {codes.map((code, index) => (
        <li
          key={code}
          className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-stone-300">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <CurrencyLabel code={code} />
            </div>
            <div className="flex shrink-0">
              <IconButton
                label={`Move ${code} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                ↑
              </IconButton>
              <IconButton
                label={`Move ${code} down`}
                disabled={index === codes.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </IconButton>
              <IconButton
                label={`Remove ${code}`}
                onClick={() => onChange(codes.filter((c) => c !== code))}
              >
                ✕
              </IconButton>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pl-7">
            {claims.get(code)?.map((claim) => (
              <TokenChip key={claim.token} claim={claim} code={code} />
            ))}
          </div>
        </li>
      ))}
    </ol>
  )
}
