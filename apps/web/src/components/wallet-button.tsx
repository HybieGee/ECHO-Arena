/**
 * Global Wallet Connection Button with Modal
 */

'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState } from 'react';

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showModal, setShowModal] = useState(false);

  const handleConnect = (connector: any) => {
    connect({ connector });
    setShowModal(false);
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-sm text-purple-300 font-mono">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 hover:border-red-500/50 rounded-lg text-sm text-red-300 transition-all"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-6 py-3 bg-gradient-to-r from-echo-magenta to-echo-cyan hover:shadow-neon-magenta-lg font-orbitron font-bold text-white rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 tracking-wider uppercase"
      >
        ⚡ CONNECT
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-slide-up">
          <div className="bg-arena-surface border-2 border-echo-magenta/50 rounded-2xl p-8 max-w-md w-full shadow-neon-magenta-lg relative overflow-hidden">
            {/* Animated background grid */}
            <div className="absolute inset-0 cyber-grid-overlay opacity-10 pointer-events-none" />

            {/* Content */}
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-orbitron font-bold tracking-wider uppercase">
                  <span className="neon-text">CONNECT WALLET</span>
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-echo-muted hover:text-echo-magenta text-3xl transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                {connectors.map((connector) => {
                  const walletName = connector.name.includes('Injected')
                    ? 'Browser Wallet'
                    : connector.name;

                  const walletSubtext = connector.name.includes('Injected')
                    ? 'MetaMask, Trust, Binance Wallet'
                    : connector.name === 'WalletConnect'
                    ? 'Mobile wallet via QR code'
                    : 'Coinbase Wallet';

                  return (
                    <button
                      key={connector.id}
                      onClick={() => handleConnect(connector)}
                      disabled={isPending}
                      className="w-full p-4 bg-gradient-to-br from-arena-surface to-arena-hover border-2 border-echo-magenta/20 hover:border-echo-cyan/50 rounded-xl text-left transition-all duration-300 group hover:shadow-glow-ring-hover disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-echo-magenta to-echo-cyan rounded-lg flex items-center justify-center text-3xl shadow-neon-magenta group-hover:scale-110 transition-transform">
                          {connector.name.includes('Injected') ? '🦊' :
                           connector.name === 'WalletConnect' ? '📱' : '💰'}
                        </div>
                        <div className="flex-1">
                          <div className="font-orbitron font-bold text-echo-text group-hover:text-echo-cyan transition-colors tracking-wide">
                            {walletName.toUpperCase()}
                          </div>
                          <div className="text-sm text-echo-muted">
                            {walletSubtext}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-echo-gold/10 border border-echo-gold/30 rounded-lg">
                <p className="text-sm text-echo-gold font-medium">
                  ⚠️ Ensure BSC network <span className="font-orbitron">(Chain ID: 56)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
