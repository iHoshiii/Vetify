import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import ChatLauncher from './components/messaging/ChatLauncher';
import { ChatProvider } from './components/messaging/ChatProvider';
import { AuthProvider } from './components/providers/AuthProvider';
import { ReactQueryProvider } from './components/providers/ReactQueryProvider';
import { LocaleProvider } from './components/providers/LocaleProvider';
import RealtimeBridge from './components/providers/RealtimeBridge';
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
      <LocaleProvider>
        <AuthProvider>
          <ReactQueryProvider>
            <RealtimeBridge />
            <ChatProvider>
              <App />
              <ChatLauncher />
            </ChatProvider>
          </ReactQueryProvider>
        </AuthProvider>
      </LocaleProvider>
    </BrowserRouter>
  </React.StrictMode>
);
