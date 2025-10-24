/**
 * Wagmi configuration for BSC + Binance Wallet
 */

import { createConfig, http, type Config } from 'wagmi';
import { bsc, bscTestnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// WalletConnect project ID (replace with your own)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id';

export const config: Config = createConfig({
  chains: [bsc, bscTestnet],
  connectors: [
    injected({
      target: 'metaMask',
    }),
    injected({
      target: 'trust',
    }),
    walletConnect({
      projectId,
      metadata: {
        name: 'ECHO Arena',
        description: 'AI Trading Game on BSC',
        url: 'https://echoarena.ai',
        icons: ['https://echoarena.ai/icon.png'],
      },
    }),
  ],
  transports: {
    [bsc.id]: http('https://bsc-dataseed.binance.org'),
    [bscTestnet.id]: http('https://data-seed-prebsc-1-s1.binance.org:8545'),
  },
});
