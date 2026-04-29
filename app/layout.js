import Sidebar from './components/Sidebar';
import AutoLogout from './components/AutoLogout';
import ThemeProvider from './components/ThemeProvider';
import './globals.css';

export const metadata = {
  title: 'AICEA Prompt Lab',
  description: '생성형 AI 프롬프트 학습·생성·관리 올인원 플랫폼',
  icons: [
    { rel: 'icon', url: '/favicon.png' },
    { rel: 'apple-touch-icon', url: '/favicon.png' },
  ],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1120' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider>
          <div className="app-container">
            <AutoLogout />
            <Sidebar />
            <main className="main-content relative">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
