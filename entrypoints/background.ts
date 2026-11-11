import browser from 'webextension-polyfill'

export default defineBackground(() => {
  // Ask for the home currency on first install (not on updates).
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
      void browser.tabs.create({
        url: browser.runtime.getURL('/onboarding.html'),
      })
    }
  })
})
