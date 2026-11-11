import browser from 'webextension-polyfill'

const WEB_PAGES = ['http://*/*', 'https://*/*']

/**
 * Reload the web page the user is looking at, so its prices are converted
 * again with the new settings.
 *
 * From the popup, that's the active tab. From the options page (itself the
 * active tab), it's the web page used most recently instead.
 */
export async function reloadPage(): Promise<void> {
  const [active] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  })
  if (active?.id !== undefined && /^https?:/.test(active.url ?? '')) {
    await browser.tabs.reload(active.id)
    return
  }

  const webTabs = await browser.tabs.query({ url: WEB_PAGES })
  const latest = webTabs
    .filter((tab) => tab.id !== undefined)
    .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0]
  if (latest?.id !== undefined) await browser.tabs.reload(latest.id)
}
