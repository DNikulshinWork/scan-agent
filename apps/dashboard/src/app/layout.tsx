import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ScanAgent HH Dashboard',
  description: 'Мониторинг вакансий HH.ru на фильтрах резюме (Next.js 16, Fastify, Neon, GitHub Pages)',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className="bg-gray-950 text-gray-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
