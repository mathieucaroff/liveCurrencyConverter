import { useState } from 'react'
import browser from 'webextension-polyfill'

import { currencyName } from '~/lib/currencies'
import { guessHomeCurrency } from '~/lib/locale'
import { HomeCurrencySelect } from '~/ui/HomeCurrencySelect'

/** First-run question: which currency should prices be converted into? */
export function OnboardingPanel({
  onDone,
}: {
  onDone: (homeCurrency: string) => Promise<void>
}) {
  const [home, setHome] = useState(() => guessHomeCurrency(navigator.languages))
  const [isSaving, setIsSaving] = useState(false)

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-stone-50">
          Which currency do you use?
        </h2>
        <p className="text-sm leading-5 text-stone-400">
          Prices found in web pages will be shown with their value in this
          currency. You can change it later in the settings.
        </p>
      </div>

      <HomeCurrencySelect value={home} onChange={setHome} />

      <button
        type="button"
        disabled={isSaving}
        onClick={async () => {
          setIsSaving(true)
          await onDone(home)
        }}
        className="w-full rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-stone-950 transition hover:bg-amber-300 disabled:opacity-60"
      >
        Continue
      </button>
    </section>
  )
}

/** Shown on the welcome page once the home currency is chosen. */
export function OnboardingDone({ homeCurrency }: { homeCurrency: string }) {
  async function closeTab() {
    const tab = await browser.tabs.getCurrent()
    if (tab?.id !== undefined) await browser.tabs.remove(tab.id)
  }

  return (
    <section className="space-y-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-stone-50">You're all set</h2>
        <p className="text-sm leading-5 text-stone-300">
          Prices will be converted into{' '}
          <strong className="text-amber-200">
            {currencyName(homeCurrency)} ({homeCurrency})
          </strong>
          . Pin the extension to your toolbar to reach its settings, where you
          can pick which currencies are detected.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void closeTab()}
        className="w-full rounded-xl border border-white/10 py-2 text-sm text-stone-200 transition hover:bg-white/10"
      >
        Close this tab
      </button>
    </section>
  )
}
