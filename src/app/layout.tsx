
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const siteUrl = process.env.PANEL_BASE_URL || 'http://localhost:9002';

export const metadata: Metadata = {
  title: "Marcus | Le Bot Discord Ultime, Propulsé par l'IA",
  description: "Une solution tout-en-un pour la modération, la sécurité, et l'animation de votre serveur, avec des fonctionnalités IA de pointe pour une gestion intelligente.",
  metadataBase: new URL(siteUrl),
  themeColor: 'hsl(15 88% 62%)',
  openGraph: {
    title: "Marcus | Le Bot Discord Ultime, Propulsé par l'IA",
    description: "La solution tout-en-un pour la gestion de serveurs Discord.",
    url: siteUrl,
    siteName: 'Marcus Bot',
    images: [
      {
        url: '/og-image.png', // Assurez-vous d'avoir ce fichier dans votre dossier /public
        width: 1200,
        height: 630,
        alt: 'Bannière de Marcus Bot',
      },
    ],
    locale: 'fr_FR',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        ></link>
      </head>
      <body className="font-sans antialiased bg-background">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
