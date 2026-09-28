'use client';

import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider, useTheme } from 'next-themes';
import { Toaster } from 'sonner';

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster position="top-center" richColors closeButton theme={resolvedTheme === 'dark' ? 'dark' : 'light'} />;
}

function ServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}

export default function Providers({ children }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
        {children}
        <ThemedToaster />
        <ServiceWorker />
      </ThemeProvider>
    </SessionProvider>
  );
}
