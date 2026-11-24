import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';

export const metadata: Metadata = {
  title: 'Cream Treat — Desserts & Savouries',
  description:
    'Menu and ordering for Cream Treat café. Fresh sundaes, chilled shakes, and warm savoury treats.',
  icons: {
    icon: '/images/cream-treat-logo.jpg',
    apple: '/images/cream-treat-logo.jpg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Syne:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#FBF7F2] text-[#6A0019] antialiased selection:bg-[#6A0019] selection:text-[#EFE6DC]">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
