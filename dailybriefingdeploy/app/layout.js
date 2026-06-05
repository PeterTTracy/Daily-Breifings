import './globals.css';
import Providers from './providers';
import Nav from './components/Nav';
import ThemeToggle from './components/ThemeToggle';

export const metadata = {
  title: 'MIT Dining Operations',
  description: 'Campus dining operations — daily briefing, house views, and portfolio roll-up',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Dining Ops' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1B3A5C',
};

// Runs before paint to apply the saved (or system) theme and avoid a flash of
// the wrong mode. Keeps the same localStorage key used since the briefing app.
const noFlashScript = `(function(){try{var t=localStorage.getItem('briefing-theme');var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&m)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body className="min-h-screen bg-pagebg text-ink">
        <Providers>
          <header className="sticky top-0 z-40 border-b border-line bg-pagebg/85 backdrop-blur">
            <div className="mx-auto flex w-full max-w-content items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-[3px] bg-accent" aria-hidden="true" />
                <span className="text-[13px] font-semibold tracking-tight text-ink">MIT Dining Ops</span>
              </div>
              <ThemeToggle />
            </div>
          </header>
          <main className="mx-auto w-full max-w-content px-4 pb-28 pt-5">{children}</main>
          <Nav />
        </Providers>
      </body>
    </html>
  );
}
