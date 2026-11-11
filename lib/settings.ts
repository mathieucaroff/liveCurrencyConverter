import browser from 'webextension-polyfill'
import { z } from 'zod'

import { CURRENCIES_BY_WEALTH, isKnownCurrency } from './currencies'

const settingsSchema = z.object({
  enabled: z.boolean().catch(true).default(true),
  /** False until the user has chosen a home currency; nothing is converted before. */
  onboarded: z.boolean().catch(false).default(false),
  homeCurrency: z.string().refine(isKnownCurrency).catch('USD').default('USD'),
  /**
   * Ordered: a currency higher in the list wins shared symbols and names.
   * It may contain the home currency, whose prices are detected (so they keep
   * their symbols) but never converted.
   */
  sourceCurrencies: z
    .array(z.string())
    .catch(() => [...CURRENCIES_BY_WEALTH])
    .default(() => [...CURRENCIES_BY_WEALTH]),
})

export type Settings = z.infer<typeof settingsSchema>

const SETTINGS_KEY = 'settings'

function normalizeSettings(input: unknown): Settings {
  const settings = settingsSchema.parse(input ?? {})
  settings.sourceCurrencies = [...new Set(settings.sourceCurrencies)].filter(
    isKnownCurrency,
  )
  return settings
}

const DEFAULT_SETTINGS = normalizeSettings({})

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY)
  const settings = normalizeSettings(stored[SETTINGS_KEY])

  if (!stored[SETTINGS_KEY]) {
    await browser.storage.local.set({ [SETTINGS_KEY]: settings })
  }

  return settings
}

export async function updateSettings(
  patch: Partial<Settings>,
): Promise<Settings> {
  const current = await getSettings()
  const next = normalizeSettings({ ...current, ...patch })
  await browser.storage.local.set({ [SETTINGS_KEY]: next })
  return next
}

/**
 * Finish onboarding with the chosen home currency. The home currency moves to
 * the top of the source list, so it keeps its symbols (e.g. "¥" for JPY over
 * CNY) and prices in it are left alone instead of being read as another
 * currency.
 */
export async function completeOnboarding(
  homeCurrency: string,
): Promise<Settings> {
  const current = await getSettings()
  return updateSettings({
    homeCurrency,
    sourceCurrencies: [
      homeCurrency,
      ...current.sourceCurrencies.filter((code) => code !== homeCurrency),
    ],
    onboarded: true,
  })
}

export function onSettingsChanged(callback: (settings: Settings) => void) {
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[SETTINGS_KEY]) {
      return
    }

    callback(
      normalizeSettings(changes[SETTINGS_KEY].newValue ?? DEFAULT_SETTINGS),
    )
  })
}

export { DEFAULT_SETTINGS, SETTINGS_KEY }
