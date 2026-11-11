import { useEffect, useState, type ReactNode } from 'react'

import {
  DEFAULT_SETTINGS,
  type Settings,
  completeOnboarding,
  getSettings,
  updateSettings,
} from '~/lib/settings'
import { HomeCurrencySelect } from '~/ui/HomeCurrencySelect'
import { OnboardingDone, OnboardingPanel } from '~/ui/Onboarding'
import { SourceCurrencyList } from '~/ui/SourceCurrencyList'

type SettingsAppProps = {
  /** "onboarding" is the welcome page opened on install. */
  mode: 'popup' | 'options' | 'onboarding'
}

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
          ? // the home currency dropdown floats over the page, so the popup
            // needs room for it while onboarding (popups max out at 600px)
            `w-[22rem] bg-stone-950 ${!isLoading && !settings.onboarded ? 'min-h-[36rem]' : ''}`
          : 'min-h-screen bg-stone-950'
      }
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(234,179,8,0.24),_transparent_40%),linear-gradient(135deg,_rgba(41,37,36,0.95),_rgba(12,10,9,1))]" />
      <section className="relative min-h-full text-stone-50">
        <div
          className={`relative mx-auto max-w-xl ${
            mode === 'popup' ? 'space-y-3 p-4' : 'space-y-4 p-6'
          }`}
        >
          <header className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.3em] text-amber-300/80 uppercase">
              Live Currency Converter
            </p>
            {mode !== 'popup' && (
              <h1 className="text-2xl leading-tight font-semibold text-stone-50">
                {mode === 'onboarding' ? 'Welcome' : 'Extension settings'}
              </h1>
            )}
          </header>

          {isLoading ? null : !settings.onboarded ? (
            <OnboardingPanel
              onDone={async (homeCurrency) => {
                setSettings(await completeOnboarding(homeCurrency))
              }}
            />
          ) : mode === 'onboarding' ? (
            <OnboardingDone homeCurrency={settings.homeCurrency} />
          ) : (
            renderSettings()
          )}
        </div>
      </section>
    </main>
  )

  function renderSettings() {
    return (
      <>
        <EnableToggle
          checked={settings.enabled}
          disabled={isLoading}
          onChange={(enabled) => void save({ enabled })}
        />

        <div
          className={`space-y-3 transition ${
            settings.enabled ? '' : 'opacity-60 grayscale'
          }`}
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
      </>
    )
  }
}
