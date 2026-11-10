import browser from 'webextension-polyfill'
import { z } from 'zod'

/** Exchange rates are refetched after this delay. */
export const RATES_TTL_MS = 6 * 60 * 60 * 1000

/** `rates[X]` = how many X one unit of the home currency buys. */
export type Rates = Record<string, number>

const cacheSchema = z.object({
  fetchedAt: z.number(),
  rates: z.record(z.string(), z.number().positive()),
})

const responseSchema = z.object({
  rates: z.record(z.string(), z.number().positive()),
})

type CachedRates = z.infer<typeof cacheSchema>

function cacheKey(home: string): string {
  return `rates:${home}`
}

async function readCache(home: string): Promise<CachedRates | undefined> {
  const key = cacheKey(home)
  const stored = await browser.storage.local.get(key)
  const parsed = cacheSchema.safeParse(stored[key])
  return parsed.success ? parsed.data : undefined
}

/**
 * Rates from the home currency to every other currency, cached in extension
 * storage (shared by all tabs) and refreshed every 6 hours. Falls back to a
 * stale cache when offline; returns null when no rates are available at all.
 */
export async function getRates(home: string): Promise<Rates | null> {
  const cached = await readCache(home)
  if (cached && Date.now() - cached.fetchedAt < RATES_TTL_MS) {
    return cached.rates
  }

  try {
    const response = await fetch(
      `https://open.exchangerate-api.com/v6/latest/${encodeURIComponent(home)}`,
    )
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const { rates } = responseSchema.parse(await response.json())
    const entry: CachedRates = { fetchedAt: Date.now(), rates }
    await browser.storage.local.set({ [cacheKey(home)]: entry })
    return rates
  } catch (error) {
    console.warn(
      `[Live Currency Converter] could not fetch ${home} rates`,
      error,
    )
    return cached?.rates ?? null
  }
}
