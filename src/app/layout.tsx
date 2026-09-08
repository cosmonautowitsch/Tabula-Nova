import type {Metadata} from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import ClientOnlyWrapper from '@/components/ClientOnlyWrapper';
// Removed: import { FolderIconSprite } from '@/components/icons/FolderIconSprite';

export const metadata: Metadata = {
  title: 'Tabula Nova',
  description: 'Your new personalized tab page.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased font-sans`}>
        {/* Removed: <FolderIconSprite /> */}
        <ClientOnlyWrapper>
          {children}
          <Toaster />
        </ClientOnlyWrapper>
      </body>
    </html>
  );
}
