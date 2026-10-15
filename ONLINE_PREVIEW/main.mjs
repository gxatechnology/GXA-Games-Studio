import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.mjs';

// StrictMode intentionally omitted until the Three.js lifecycle and timer handlers
// are fully audited under double-mount development behavior.
createRoot(document.getElementById('root')).render(React.createElement(App, null));
