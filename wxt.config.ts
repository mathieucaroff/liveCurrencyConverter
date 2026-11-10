import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'
import packageInfo from './package.json' with { type: 'json' }

export default defineConfig({
  srcDir: '.',
  modules: ['@wxt-dev/module-react', '@wxt-dev/webextension-polyfill'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Live Currency Converter',
    short_name: 'LCC',
    description: 'Convert prices live in sites you visit',
    version: packageInfo.version,
    permissions: ['storage'],
    host_permissions: ['*://*/*'],
    icons: {
      '16': 'icon/icon-16x16.png',
      '32': 'icon/icon-32x32.png',
      '48': 'icon/icon-48x48.png',
      '128': 'icon/icon-128x128.png',
      '180': 'icon/icon-180x180.png',
      '192': 'icon/icon-192x192.png',
      '512': 'icon/icon-512x512.png',
      '1024': 'icon/icon-1024x1024.png',
    },
    browser_specific_settings: {
      gecko: {
        id: 'live-currency-converter@oxie.cc',
      },
    },
  },
})
