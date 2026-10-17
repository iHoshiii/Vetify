import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AccountLoginMethods } from '@shared/account-auth';
import SettingsPage from '@/pages/settings/settings-page';

export function SettingsNavigationApp({ section }: { section: string }) {
  const [client] = useState(() => {
    const queryClient = new QueryClient();
    queryClient.setQueryData<AccountLoginMethods>(['account-login-methods', 'owner'], {
      hasPassword: true,
      providers: [],
      googleAvailable: false,
      availableProviders: [],
      passwordReady: false,
      reauthProvider: null,
    });
    return queryClient;
  });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/settings/${section}`]}>
        <Routes>
          <Route path="/settings/:section" element={<SettingsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
