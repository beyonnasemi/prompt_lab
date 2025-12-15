import Sidebar from './components/Sidebar';
import AdminHeader from './components/AdminHeader';
import AutoLogout from './components/AutoLogout';
import "./globals.css";

export const metadata = {
  title: "Prompt Lab",
  description: "Generative AI Education Platform",
  icons: [
    { rel: 'icon', url: 'https://img.aicec.kr/web_images/logo_aicea.png?v=3' },
    { rel: 'apple-touch-icon', url: 'https://img.aicec.kr/web_images/logo_aicea.png?v=3' },
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
          <AdminHeader />
          <Sidebar />
          <main className="main-content" style={{ position: 'relative' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
