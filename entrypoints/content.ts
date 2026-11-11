import { createMatcher } from '~/lib/matcher'
import {
  createConverter,
  findAndConvert,
  type Converter,
} from '~/lib/pageConverter'
import { getRates } from '~/lib/rates'
import { getSettings, onSettingsChanged, type Settings } from '~/lib/settings'

const RESCAN_DELAY_MS = 200

let converter: Converter | null = null
let rescanTimer: number | undefined
/** Bumped on every settings change, so a slow rate fetch can't apply stale settings. */
let configVersion = 0

async function configure(settings: Settings) {
  const version = ++configVersion
  converter = null
  if (
    !settings.onboarded ||
    !settings.enabled ||
    settings.sourceCurrencies.length === 0
  ) {
    return
  }

  const matcher = createMatcher(settings.sourceCurrencies)
  const rates = await getRates(settings.homeCurrency)
  if (version !== configVersion || !matcher || !rates) return

  converter = createConverter({
    home: settings.homeCurrency,
    matcher,
    rates,
    locale: navigator.language,
  })
  scan()
}

function scan() {
  if (converter && document.body) findAndConvert(converter, document.body)
}

/** Rescan at most once per RESCAN_DELAY_MS. */
function scheduleRescan() {
  if (!converter || rescanTimer !== undefined) return
  rescanTimer = window.setTimeout(() => {
    rescanTimer = undefined
    scan()
  }, RESCAN_DELAY_MS)
}

export default defineContentScript({
  matches: ['*://*/*'],
  async main() {
    onSettingsChanged((settings) => void configure(settings))

    document.documentElement.addEventListener('click', scheduleRescan, true)
    // New elements (childList) and text changed in place (characterData), e.g.
    // a price filled in late or re-rendered by the site. Our own annotations
    // also trigger one rescan, which finds nothing new and writes nothing.
    new MutationObserver(scheduleRescan).observe(document.documentElement, {
      childList: true,
      characterData: true,
      subtree: true,
    })

    await configure(await getSettings())
  },
})
