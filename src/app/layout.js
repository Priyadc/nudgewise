import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import Providers from './providers';
import { accentBootScript } from '@/lib/theme';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk', display: 'swap' });

export const metadata = {
  title: { default: 'Tickrupee — Tasks, reminders & money in one place', template: '%s · Tickrupee' },
  description:
    'Tickrupee brings your to-dos, reminders, bills and spending into one beautiful app. Voice input, photo attachments, shared lists and dark mode.',
  applicationName: 'Tickrupee',
  manifest: '/manifest.json',
  icons: { icon: '/icon.svg', apple: '/icons/icon-192.png' },
  appleWebApp: { capable: true, title: 'Tickrupee', statusBarStyle: 'black-translucent' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f7ff' },
    { media: '(prefers-color-scheme: dark)', color: '#12101c' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${grotesk.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: accentBootScript }} />
      </head>
      <body>
        <div className="aurora" aria-hidden />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
