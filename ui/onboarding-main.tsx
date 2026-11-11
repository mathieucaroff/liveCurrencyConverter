import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { SettingsApp } from '~/ui/SettingsApp'
import '~/ui/styles.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Onboarding root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <SettingsApp mode="onboarding" />
  </StrictMode>,
)
