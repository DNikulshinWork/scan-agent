import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#030712',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: 'ScanAgent HH Dashboard',
  description: 'Мониторинг вакансий HH.ru на фильтрах резюме (Next.js 16, Fastify, Neon, GitHub Pages)',
  manifest: `${basePath}/manifest.json`,
  icons: {
    icon: `${basePath}/icon.svg`,
    apple: `${basePath}/apple-touch-icon.png`,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ScanAgent',
  },
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

