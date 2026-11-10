import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { SettingsApp } from '~/ui/SettingsApp';
import '~/ui/styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Popup root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <SettingsApp mode="popup" />
  </StrictMode>
);