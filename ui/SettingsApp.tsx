import { useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  CURRENCIES,
  PREFERRED_HOME_CURRENCIES,
  resolveTokenOwnership,
} from '~/lib/currencies'
import {
  DEFAULT_SETTINGS,
  type Settings,
  getSettings,
  updateSettings,
} from '~/lib/settings'
import { CurrencyLabel, CurrencyPicker } from '~/ui/CurrencyPicker'
import { EnabledCurrencyList } from '~/ui/EnabledCurrencyList'

type SettingsAppProps = {
  mode: 'popup' | 'options'
}

const ALL_CODES = CURRENCIES.map((currency) => currency.code).sort()

function Card({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-stone-100">{title}</h2>
          {description && (
            <p className="text-sm leading-5 text-stone-400">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function EnableToggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm font-medium text-stone-100">
          <span aria-hidden="true" className="inline-block w-3 text-center">
            ▶
          </span>
          <span>Enable extension</span>
        </div>
        <div className="text-sm leading-5 text-stone-400">
          Go through pages dynamically to find and convert money amounts.
        </div>
      </div>

      <span className="relative mt-1 inline-flex shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="h-6 w-11 rounded-full bg-stone-700 transition peer-checked:bg-amber-400 peer-disabled:opacity-60" />
        <span className="pointer-events-none absolute left-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

export function SettingsApp({ mode }: SettingsAppProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isPickingHome, setIsPickingHome] = useState(false)

  useEffect(() => {
    let isMounted = true

    void getSettings().then((nextSettings) => {
      if (!isMounted) {
        return
      }

      setSettings(nextSettings)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [])

  async function save(patch: Partial<Settings>) {
    setSettings(await updateSettings(patch))
  }

  const { homeCurrency, sourceCurrencies } = settings

  const addableCodes = useMemo(
    () =>
      ALL_CODES.filter(
        (code) => code !== homeCurrency && !sourceCurrencies.includes(code),
      ),
    [homeCurrency, sourceCurrencies],
  )

  /** Tokens a currency would lose if added at the bottom of the list. */
  function conflictHint(code: string) {
    const lost =
      resolveTokenOwnership([...sourceCurrencies, code])
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
    <main
      className={
        mode === 'popup'
          ? 'w-[22rem] bg-stone-950'
          : 'min-h-screen bg-stone-950'
      }
    >
      <section className="relative overflow-hidden text-stone-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(234,179,8,0.24),_transparent_40%),linear-gradient(135deg,_rgba(41,37,36,0.95),_rgba(12,10,9,1))]" />
        <div
          className={`relative mx-auto max-w-xl ${
            mode === 'popup' ? 'space-y-3 p-4' : 'space-y-4 p-6'
          }`}
        >
          <header className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.3em] text-amber-300/80 uppercase">
              Live Currency Converter
            </p>
            {mode === 'options' && (
              <h1 className="text-2xl leading-tight font-semibold text-stone-50">
                Extension settings
              </h1>
            )}
          </header>

          <EnableToggle
            checked={settings.enabled}
            disabled={isLoading}
            onChange={(enabled) => void save({ enabled })}
          />

          <div
            className={`space-y-3 transition ${
              settings.enabled ? '' : 'opacity-60 grayscale'
            } ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
          >
            <Card
              title="Home currency"
              description="Detected prices are converted into this currency."
              action={
                <button
                  type="button"
                  onClick={() => setIsPickingHome(!isPickingHome)}
                  className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-stone-200 transition hover:bg-white/10"
                >
                  {isPickingHome ? 'Close' : 'Change'}
                </button>
              }
            >
              <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2">
                <CurrencyLabel code={homeCurrency} />
              </div>
              {isPickingHome && (
                <CurrencyPicker
                  autoFocus
                  selected={homeCurrency}
                  placeholder="Search by code, name or symbol"
                  sections={[
                    { label: 'Common', codes: PREFERRED_HOME_CURRENCIES },
                    {
                      label: 'All currencies',
                      codes: ALL_CODES.filter(
                        (code) => !PREFERRED_HOME_CURRENCIES.includes(code),
                      ),
                    },
                  ]}
                  hint={(code) =>
                    sourceCurrencies.includes(code)
                      ? 'Will be removed from the converted currencies'
                      : null
                  }
                  onPick={(code) => {
                    setIsPickingHome(false)
                    void save({ homeCurrency: code })
                  }}
                />
              )}
            </Card>

            <Card
              title="Converted currencies"
              description="Currencies higher in the list get priority on shared symbols and names. Crossed-out ones are detected as the currency shown after the arrow."
            >
              <EnabledCurrencyList
                codes={sourceCurrencies}
                onChange={(codes) => void save({ sourceCurrencies: codes })}
              />
              {sourceCurrencies.length > 0 && (
                <p className="text-xs leading-5 text-stone-500">
                  Changes apply to new page content. Reload a page to re-convert
                  prices that were already annotated.
                </p>
              )}
            </Card>

            <Card title="Add a currency">
              <CurrencyPicker
                placeholder="Search by code, name or symbol"
                sections={[{ codes: addableCodes }]}
                hint={conflictHint}
                onPick={(code) =>
                  void save({ sourceCurrencies: [...sourceCurrencies, code] })
                }
              />
            </Card>
          </div>
        </div>
      </section>
    </main>
  )
}
