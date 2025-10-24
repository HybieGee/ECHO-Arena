/**
 * Wagmi configuration for BSC + Multiple Wallets
 */

import { createConfig, http, type Config } from 'wagmi';
import { bsc, bscTestnet } from 'wagmi/chains';
import { metaMask, walletConnect, coinbaseWallet, injected } from 'wagmi/connectors';

// WalletConnect project ID (replace with your own)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id';

export const config: Config = createConfig({
  chains: [bsc, bscTestnet],
  connectors: [
    // MetaMask - explicit connector for MetaMask extension
    metaMask({
      dappMetadata: {
        name: 'ECHO Arena',
      },
    }),
    // Generic injected for Trust Wallet, Binance Wallet, etc.
    injected({
      shimDisconnect: true,
      target() {
        return {
          id: 'injected',
          name: 'Other Browser Wallets',
          provider: typeof window !== 'undefined' ? window.ethereum : undefined,
        };
      },
    }),
    // WalletConnect for mobile wallets
    walletConnect({
      projectId,
      metadata: {
        name: 'ECHO Arena',
        description: 'AI Trading Game on BSC',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://echoarena.ai',
        icons: ['https://echoarena.ai/icon.png'],
      },
      showQrModal: true,
    }),
    // Coinbase Wallet
    coinbaseWallet({
      appName: 'ECHO Arena',
      appLogoUrl: 'https://echoarena.ai/icon.png',
    }),
  ],
  transports: {
    [bsc.id]: http('https://bsc-dataseed.binance.org'),
    [bscTestnet.id]: http('https://data-seed-prebsc-1-s1.binance.org:8545'),
  },
  ssr: true,
});
