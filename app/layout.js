import './styles.css';
import './inquiry.css';

const siteTitle = 'Living Well with USANA';
const siteDescription =
  'Independent USANA product guide by Sally Quimson, RN. Explore USANA products, wellness information, and the Brand Partner business opportunity.';

export const metadata = {
  metadataBase: new URL('https://livingwellwithusana.vercel.app'),
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  applicationName: siteTitle,
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_PH',
    url: '/',
    siteName: siteTitle,
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: '/og-share.png',
        width: 1200,
        height: 630,
        alt: 'Living Well with USANA — products, wellness education, and business information',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/og-share.png'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
