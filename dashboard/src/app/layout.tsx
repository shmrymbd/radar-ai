import type { Metadata } from 'next';
import './globals.css';
import { DeviceProvider } from '@/contexts/DeviceContext';

export const metadata: Metadata = {
  title: 'Traffic Signal Control Dashboard',
  description: 'Real-time radar data monitoring and signal optimization',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <DeviceProvider>
          {children}
        </DeviceProvider>
      </body>
    </html>
  );
}