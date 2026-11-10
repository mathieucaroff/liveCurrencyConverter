import { useEffect, useState } from 'react'

import {
  DEFAULT_SETTINGS,
  type Settings,
  getSettings,
  updateSettings,
} from '~/lib/settings'

type SettingsAppProps = {
  mode: 'popup' | 'options'
}

type SettingKey = keyof Settings

const SETTING_LABELS: Record<
  SettingKey,
  { icon: string; title: string; description: string }
> = {
  enabled: {
    icon: '▶',
    title: 'Enable extension',
    description:
      'Go through pages dynamically to find and convert money amounts.',
  },
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

  async function handleToggle(key: SettingKey, checked: boolean) {
    const nextSettings = await updateSettings({ [key]: checked })
    setSettings(nextSettings)
  }

  function getOptionStyleClassNames(key: SettingKey) {
    if (key === 'enabled' || settings.enabled) {
      return {
        card: 'border-white/10 bg-white/5',
        title: 'text-stone-100',
        description: 'text-stone-400',
        track: 'bg-stone-700',
        thumb: 'bg-white',
      }
    }

    return {
      card: 'border-white/5 bg-black/20 grayscale',
      title: 'text-stone-400',
      description: 'text-stone-500',
      track: 'bg-stone-900',
      thumb: 'bg-stone-300',
    }
  }

  return (
    <main
      className={
        mode === 'popup' ? 'min-w-80 bg-stone-950' : 'min-h-screen bg-stone-950'
      }
    >
      <section className="relative overflow-hidden text-stone-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(234,179,8,0.24),_transparent_40%),linear-gradient(135deg,_rgba(41,37,36,0.95),_rgba(12,10,9,1))]" />
        <div className="relative space-y-6 p-5">
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

          <div className="space-y-3">
            {(Object.keys(SETTING_LABELS) as SettingKey[]).map((key) => {
              const label = SETTING_LABELS[key]
              const twClassSet = getOptionStyleClassNames(key)

              return (
                <label
                  key={key}
                  className={`flex items-start justify-between gap-4 rounded-2xl border p-4 backdrop-blur-sm transition ${twClassSet.card}`}
                >
                  <div className="space-y-1">
                    <div
                      className={`flex items-center gap-2 text-sm font-medium ${twClassSet.title}`}
                    >
                      <span
                        aria-hidden="true"
                        className="inline-block w-3 text-center"
                      >
                        {label.icon}
                      </span>
                      <span>{label.title}</span>
                    </div>
                    <div
                      className={`text-sm leading-5 ${twClassSet.description}`}
                    >
                      {label.description}
                    </div>
                  </div>

                  <span className="relative mt-1 inline-flex shrink-0 items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={settings[key]}
                      disabled={isLoading}
                      onChange={(event) => {
                        void handleToggle(key, event.target.checked)
                      }}
                    />
                    <span
                      className={`h-6 w-11 rounded-full transition peer-checked:bg-amber-400 peer-disabled:opacity-60 ${twClassSet.track}`}
                    />
                    <span
                      className={`pointer-events-none absolute left-1 h-4 w-4 rounded-full transition peer-checked:translate-x-5 ${twClassSet.thumb}`}
                    />
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
