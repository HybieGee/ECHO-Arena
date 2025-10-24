/**
 * Spawn page
 * Create a bot with prompt input, preview DSL, and burn flow
 */

'use client';

import { useState } from 'react';
import { useAccount, useSendTransaction } from 'wagmi';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { parsePromptToDSL, dslToChips } from '@echo-arena/dsl';
import Link from 'next/link';

export default function SpawnPage() {
  const { address, isConnected } = useAccount();
  const [prompt, setPrompt] = useState('');
  const [previewDSL, setPreviewDSL] = useState<any>(null);
  const [step, setStep] = useState<'prompt' | 'burn' | 'success'>('prompt');

  const { data: burnPrice } = useQuery({
    queryKey: ['burn-price'],
    queryFn: api.getBurnPrice,
  });

  const { data: burnCheck } = useQuery({
    queryKey: ['burn-check', address],
    queryFn: () => api.checkBurn(address!),
    enabled: !!address,
  });

  const createBotMutation = useMutation({
    mutationFn: () => api.createBot(prompt, address!),
  });

  const verifyBurnMutation = useMutation({
    mutationFn: (txHash: string) => api.verifyBurn(txHash, address!),
  });

  const { sendTransaction } = useSendTransaction();

  if (!isConnected) {
    return (
      <div className="container-arena py-12">
        <div className="card-arena text-center">
          <h1 className="text-3xl font-bold mb-4">Connect Wallet</h1>
          <p className="text-gray-400">
            Please connect your wallet to spawn a bot.
          </p>
        </div>
      </div>
    );
  }

  const handlePreview = async () => {
    const result = await parsePromptToDSL(prompt);
    if (result.success && result.dsl) {
      setPreviewDSL(result.dsl);
    } else {
      alert(`Parse error: ${result.error}`);
    }
  };

  const handleCreate = async () => {
    if (burnCheck?.hasVerifiedBurn) {
      // Has burn, create directly
      try {
        const result = await createBotMutation.mutateAsync();
        if (result.success) {
          setStep('success');
        }
      } catch (error: any) {
        alert(`Error: ${error.message}`);
      }
    } else {
      // Need to burn
      setStep('burn');
    }
  };

  return (
    <div className="container-arena py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 neon-text text-center">
          Spawn Your Bot
        </h1>

        {step === 'prompt' && (
          <div className="space-y-6">
            {/* Eligibility Status */}
            <div className="card-arena">
              {burnCheck?.hasVerifiedBurn ? (
                <div className="text-neon-green">
                  ✓ Burn verified. You're eligible to spawn!
                </div>
              ) : (
                <div className="text-neon-yellow">
                  Entry requires burn: {burnPrice?.requiredEchoAmount || '...'} $ECHO
                  ({burnPrice?.requiredBurnBNB || 0.01} BNB equivalent)
                </div>
              )}
            </div>

            {/* Prompt Input */}
            <div className="card-arena">
              <label className="block text-sm font-semibold mb-2">
                Strategy Prompt (max 500 characters)
              </label>
              <textarea
                className="input-arena w-full h-32 resize-none"
                placeholder="Example: Buy momentum tokens with liquidity &gt; 50 BNB, take profit at 20%, stop loss at 15%, max 3 positions"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
              />
              <div className="text-sm text-gray-400 mt-2">
                {prompt.length} / 500 characters
              </div>
            </div>

            {/* Preview DSL */}
            {previewDSL && (
              <div className="card-arena glow-border">
                <h3 className="font-bold mb-3">Parsed Strategy</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {dslToChips(previewDSL).map((chip, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1 rounded-full text-sm border border-neon-${chip.color} text-neon-${chip.color}`}
                    >
                      {chip.label}
                    </span>
                  ))}
                </div>
                <pre className="text-xs text-gray-400 overflow-auto">
                  {JSON.stringify(previewDSL, null, 2)}
                </pre>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={handlePreview}
                className="btn-secondary flex-1"
                disabled={prompt.length === 0}
              >
                Preview Strategy
              </button>
              <button
                onClick={handleCreate}
                className="btn-primary flex-1"
                disabled={!previewDSL || createBotMutation.isPending}
              >
                {createBotMutation.isPending ? 'Creating...' : 'Burn & Enter'}
              </button>
            </div>
          </div>
        )}

        {step === 'burn' && (
          <div className="card-arena">
            <h2 className="text-2xl font-bold mb-4">Burn $ECHO Tokens</h2>
            <p className="text-gray-400 mb-6">
              Send {burnPrice?.requiredEchoAmount} $ECHO to the burn address:
            </p>
            <div className="bg-arena-bg p-4 rounded mb-6 font-mono text-sm break-all">
              0x000000000000000000000000000000000000dEaD
            </div>
            <p className="text-sm text-gray-400 mb-6">
              After transaction confirms, paste the tx hash below to verify.
            </p>
            <input
              type="text"
              placeholder="0x..."
              className="input-arena w-full mb-4"
              id="txHashInput"
            />
            <button
              onClick={async () => {
                const input = document.getElementById('txHashInput') as HTMLInputElement;
                const txHash = input.value;
                try {
                  await verifyBurnMutation.mutateAsync(txHash);
                  await createBotMutation.mutateAsync();
                  setStep('success');
                } catch (error: any) {
                  alert(`Error: ${error.message}`);
                }
              }}
              className="btn-primary w-full"
              disabled={verifyBurnMutation.isPending}
            >
              {verifyBurnMutation.isPending ? 'Verifying...' : 'Verify & Create Bot'}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="card-arena text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-4">Bot Spawned!</h2>
            <p className="text-gray-400 mb-6">
              Your bot has been created and will enter the arena shortly.
            </p>
            <Link href="/arena" className="btn-primary">
              View Arena
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
