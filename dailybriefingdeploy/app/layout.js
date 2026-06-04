import './globals.css';
import Providers from './providers';
import Nav from './components/Nav';

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
          <main className="mx-auto w-full max-w-content px-4 pb-24 pt-4">{children}</main>
          <Nav />
        </Providers>
      </body>
    </html>
  );
}
