export const metadata = {
  title: 'Daily Briefing — Pete Tracy',
  description: 'Morning action items, calendar, and email priorities',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#1B3A5C',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Briefing' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body style={{ margin: 0, background: '#f5f5f0' }}>{children}</body>
    </html>
  );
}
