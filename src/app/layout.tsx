import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StellarSwap — Token Swap & Liquidity Pool on Stellar Testnet',
  description:
    'A decentralized exchange and liquidity pool dApp built on Stellar Soroban. Swap tokens, provide liquidity, and interact with smart contracts on Stellar Testnet.',
  keywords: ['Stellar', 'Soroban', 'DeFi', 'Token Swap', 'Liquidity Pool', 'Blockchain', 'Testnet'],
  authors: [{ name: 'StellarSwap' }],
  openGraph: {
    title: 'StellarSwap — Stellar Token Swap dApp',
    description: 'Swap tokens and provide liquidity on Stellar Testnet with Soroban smart contracts',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-stellar-dark text-white antialiased">
        {children}
      </body>
    </html>
  );
}
