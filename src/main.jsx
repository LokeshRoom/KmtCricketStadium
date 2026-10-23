import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import App from './App';
import { firebaseConfigMissing, firebaseConfigured } from './firebase';
import './styles.css';

function FirebaseSetupRequired() {
  return <main className="configuration-error"><p className="section-kicker">KMT Cricket Stadium</p><h1>Firebase configuration required</h1><p>This production app needs its Firebase web configuration and admin allowlist before it can open.</p><p>Set the missing values in the deployment environment:</p><ul>{firebaseConfigMissing.map((key) => <li key={key}><code>{key}</code></li>)}</ul></main>;
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('PWA service worker registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {firebaseConfigured ? <BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter> : <FirebaseSetupRequired />}
  </React.StrictMode>,
);
