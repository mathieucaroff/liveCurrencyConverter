import browser from 'webextension-polyfill'
import { z } from 'zod'

const settingsSchema = z.object({
  enabled: z.boolean().default(true),
})

export type Settings = z.infer<typeof settingsSchema>

const SETTINGS_KEY = 'settings'
const DEFAULT_SETTINGS = settingsSchema.parse({})

function normalizeSettings(input: unknown): Settings {
  return settingsSchema.parse(input ?? {})
}

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
  const next = settingsSchema.parse({ ...current, ...patch })
  await browser.storage.local.set({ [SETTINGS_KEY]: next })
  return next
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
