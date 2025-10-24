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
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-semibold text-white shadow-lg shadow-purple-500/50 transition-all"
      >
        Connect Wallet
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-purple-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-purple-400">Connect Wallet</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {connectors.map((connector) => {
                const walletName = connector.name.includes('Injected')
                  ? 'Browser Wallet (MetaMask, Trust, Binance)'
                  : connector.name;

                const walletDescription = connector.name.includes('Injected')
                  ? 'Connect using MetaMask, Trust Wallet, Binance Wallet, or any browser wallet'
                  : connector.name === 'WalletConnect'
                  ? 'Connect using mobile wallet via QR code'
                  : 'Connect using Coinbase Wallet';

                return (
                  <button
                    key={connector.id}
                    onClick={() => handleConnect(connector)}
                    disabled={isPending}
                    className="w-full p-4 bg-gray-800/50 hover:bg-gray-800 border border-purple-500/20 hover:border-purple-500/50 rounded-xl text-left transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-2xl">
                        {connector.name.includes('Injected') ? '🦊' :
                         connector.name === 'WalletConnect' ? '📱' : '💰'}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                          {walletName}
                        </div>
                        <div className="text-sm text-gray-400">
                          {walletDescription}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-300">
                ⚠️ Make sure you're connected to <strong>BSC (Binance Smart Chain)</strong> network
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
