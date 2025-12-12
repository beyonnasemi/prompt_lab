import Sidebar from './components/Sidebar';
import AdminHeader from './components/AdminHeader';
import "./globals.css";

export const metadata = {
  title: "Prompt Lab",
  description: "Generative AI Education Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <div className="app-container">
          <Sidebar />
          <main className="main-content" style={{ position: 'relative' }}>
            <AdminHeader />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
