import Sidebar from './components/Sidebar';
import AdminHeader from './components/AdminHeader';
import "./globals.css";

export const metadata = {
  title: "Prompt Lab",
  description: "Generative AI Education Platform",
  icons: {
    icon: 'https://img.aicec.kr/web_images/logo_aicea.png',
    shortcut: 'https://img.aicec.kr/web_images/logo_aicea.png',
    apple: 'https://img.aicec.kr/web_images/logo_aicea.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <div className="app-container">
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
