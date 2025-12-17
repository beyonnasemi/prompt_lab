import Sidebar from './components/Sidebar';
import AutoLogout from './components/AutoLogout';
import "./globals.css";

export const metadata = {
  title: "AICEA Prompt Lab",
  description: "Generative AI Education Platform",
  icons: [
    { rel: 'icon', url: '/favicon.png' },
    { rel: 'apple-touch-icon', url: '/favicon.png' },
  ],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <div className="app-container">
          <AutoLogout />
          <Sidebar />
          <main className="main-content" style={{ position: 'relative' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
