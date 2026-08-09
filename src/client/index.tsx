import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { AuthProvider } from './components/providers/AuthProvider';
import { ReactQueryProvider } from './components/providers/ReactQueryProvider';
import './globals.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element #root not found in index.html');
}

// Provider order matches the former src/app/layout.tsx, with BrowserRouter
// outermost so route-aware hooks work everywhere beneath it.
createRoot(container).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ReactQueryProvider>
          <App />
        </ReactQueryProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
