import { cookies } from 'next/headers';
import './globals.css';
import ThemeToggle from './components/ThemeToggle';
import InstallPrompt from './components/InstallPrompt';
import LogoutButton from './components/LogoutButton';
import { AUTH_COOKIE } from '../lib/site-auth';

export const metadata = {
  title: 'Daily Briefing',
  description: 'Morning briefing — prioritized action items, FYIs, and the next meeting',
  applicationName: 'Daily Briefing',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-180.png', sizes: '180x180' },
      { url: '/icon-167.png', sizes: '167x167' },
      { url: '/icon-152.png', sizes: '152x152' },
      { url: '/icon-120.png', sizes: '120x120' },
    ],
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Briefing' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Status-bar/chrome color tracks the active scheme so it blends with the shell.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f5f2' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0e10' },
  ],
};

// Runs before paint to apply the saved (or system) theme and avoid a flash of
// the wrong mode. Same localStorage key the app has always used.
const noFlashScript = `(function(){try{var t=localStorage.getItem('briefing-theme');var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&m)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default async function RootLayout({ children }) {
  // Show the Sign-out button only when a session cookie is present.
  const cookieStore = await cookies();
  const isAuthed = Boolean(cookieStore.get(AUTH_COOKIE)?.value);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="min-h-screen bg-pagebg text-ink">
        <header className="sticky top-0 z-40 border-b border-line bg-pagebg/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-dashboard items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-[3px] bg-accent" aria-hidden="true" />
              <span className="text-[13px] font-semibold tracking-tight text-ink">Daily Briefing</span>
            </div>
            <div className="flex items-center gap-2">
              {isAuthed && <LogoutButton />}
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-dashboard px-4 pb-10 pt-5">{children}</main>
        <InstallPrompt />
      </body>
    </html>
  );
}
