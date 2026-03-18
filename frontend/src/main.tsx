import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { TenantProvider } from './contexts/TenantContext';
import './index.css';

// Synchronisation inter-onglets : si un autre onglet change de compte, recharger la page
window.addEventListener('storage', (event) => {
  if (event.key === 'accessToken' && event.oldValue !== event.newValue) {
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <TenantProvider>
    <App />
  </TenantProvider>
);
