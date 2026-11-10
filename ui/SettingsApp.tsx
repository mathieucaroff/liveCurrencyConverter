import { useEffect, useState, type ReactNode } from 'react'

import { CURRENCIES, PREFERRED_HOME_CURRENCIES } from '~/lib/currencies'
import {
  DEFAULT_SETTINGS,
  type Settings,
  getSettings,
  updateSettings,
} from '~/lib/settings'
import { CurrencyLabel, CurrencyMenu } from '~/ui/CurrencyPicker'
import { Dropdown } from '~/ui/Dropdown'
import { SourceCurrencyList } from '~/ui/SourceCurrencyList'

type SettingsAppProps = {
  mode: 'popup' | 'options'
}

const OTHER_HOME_CODES = CURRENCIES.map((currency) => currency.code)
  .filter((code) => !PREFERRED_HOME_CURRENCIES.includes(code))
  .sort()

function Card({
  title,
  description,
  children,
}: {
  title: string
  description?: ReactNode
  children?: ReactNode
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="space-y-1">
        <h2 className="text-sm font-medium text-stone-100">{title}</h2>
        {description && (
          <p className="text-sm leading-5 text-stone-400">{description}</p>
        )}
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
    <label className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition">
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

function HomeCurrencySelect({
  value,
  onChange,
}: {
  value: string
  onChange: (code: string) => void
}) {
  return (
    <Dropdown
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex w-full items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-left transition hover:border-amber-400/60"
        >
          <span className="min-w-0 flex-1">
            <CurrencyLabel code={value} />
          </span>
          <span
            aria-hidden="true"
            className={`shrink-0 text-xs text-amber-200 transition ${
              open ? 'rotate-180' : ''
            }`}
          >
            ▼
          </span>
        </button>
      )}
    >
      {(close) => (
        <CurrencyMenu
          placeholder="Search by code, name or symbol"
          sections={[
            { label: 'Common', codes: PREFERRED_HOME_CURRENCIES },
            { label: 'All currencies', codes: OTHER_HOME_CODES },
          ]}
          isChecked={(code) => code === value}
          onPick={(code) => {
            close()
            onChange(code)
          }}
        />
      )}
    </Dropdown>
  )
}

export function SettingsApp({ mode }: SettingsAppProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)

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

  return (
    <main
      className={
        mode === 'popup'
          ? 'w-[22rem] bg-stone-950'
          : 'min-h-screen bg-stone-950'
      }
    >
      <section className="relative min-h-full text-stone-50">
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
            >
              <HomeCurrencySelect
                value={settings.homeCurrency}
                onChange={(homeCurrency) => void save({ homeCurrency })}
              />
            </Card>

            <Card
              title="Source currencies"
              description="Currencies detected in pages, in priority order: a currency higher in the list gets the symbols and names it shares with lower ones (crossed out, with the owner after the arrow)."
            >
              <SourceCurrencyList
                codes={settings.sourceCurrencies}
                home={settings.homeCurrency}
                onChange={(sourceCurrencies) => void save({ sourceCurrencies })}
                listClassName={mode === 'popup' ? 'max-h-80' : 'max-h-[32rem]'}
              />
              <p className="text-xs leading-5 text-stone-500">
                Changes apply to new page content. Reload a page to re-convert
                prices that were already annotated.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </main>
  )
}
