/**
 * Spawn page
 * Create a bot with prompt input, preview DSL, and burn flow
 */

'use client';

import { useState } from 'react';
import { useAccount, useSendTransaction } from 'wagmi';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { dslToChips } from '@echo-arena/dsl';
import { useAuthContext } from '@/contexts/auth-context';
import Link from 'next/link';
import { PillButton } from '@/components/pill-button';
import Image from 'next/image';

export default function SpawnPage() {
  const { address, isConnected } = useAccount();
  const { isAuthenticated, isAuthenticating, authenticate } = useAuthContext();
  const [prompt, setPrompt] = useState('');
  const [botName, setBotName] = useState('');
  const [previewDSL, setPreviewDSL] = useState<any>(null);
  const [step, setStep] = useState<'auth' | 'prompt' | 'burn' | 'success'>(
    isAuthenticated ? 'prompt' : 'auth'
  );

  const { data: burnPrice } = useQuery({
    queryKey: ['burn-price'],
    queryFn: api.getBurnPrice,
  });

  const { data: burnCheck } = useQuery({
    queryKey: ['burn-check', address],
    queryFn: () => api.checkBurn(address!),
    enabled: !!address,
  });

  const { data: eligibilityCheck } = useQuery({
    queryKey: ['eligibility-check', address],
    queryFn: () => api.checkEligibility(address!),
    enabled: !!address,
  });

  const createBotMutation = useMutation({
    mutationFn: () => api.createBot(prompt, address!, botName),
  });

  const previewMutation = useMutation({
    mutationFn: () => api.previewBot(prompt),
  });

  const verifyBurnMutation = useMutation({
    mutationFn: (txHash: string) => api.verifyBurn(txHash, address!),
  });

  const { sendTransaction } = useSendTransaction();

  if (!isConnected) {
    return (
      <div className="container-arena py-12">
        <div className="card-arena text-center">
          <h1 className="text-3xl font-orbitron font-bold mb-4 neon-text">CONNECT WALLET</h1>
          <p className="text-echo-muted">
            Please connect your wallet to spawn a bot.
          </p>
        </div>
      </div>
    );
  }

  const handleAuthenticate = async () => {
    try {
      await authenticate();
      setStep('prompt');
    } catch (error: any) {
      alert(`Authentication failed: ${error.message}`);
    }
  };

  const handlePreview = async () => {
    try {
      const result = await previewMutation.mutateAsync();
      if (result.success && result.dsl) {
        setPreviewDSL(result.dsl);
      } else {
        alert(`Parse error: ${result.error || 'Failed to parse'}`);
      }
    } catch (error: any) {
      alert(`Preview error: ${error.message}`);
    }
  };

  const handleCreate = async () => {
    // Check free eligibility first
    if (eligibilityCheck?.eligible || burnCheck?.hasVerifiedBurn) {
      // Free spawn or has burn, create directly
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
        <h1 className="text-4xl font-orbitron font-bold mb-8 text-echo-cyan text-center uppercase tracking-wider">
          SPAWN YOUR BOT
        </h1>

        {/* Authentication Step */}
        {step === 'auth' && !isAuthenticated && (
          <div className="card-arena text-center">
            <div className="flex justify-center mb-6">
              <Image
                src="/icons/Sign.png"
                alt="Verify Ownership"
                width={120}
                height={120}
                className="object-contain"
              />
            </div>
            <h2 className="text-2xl font-orbitron font-bold mb-4 text-echo-cyan uppercase tracking-wide">
              VERIFY OWNERSHIP
            </h2>
            <p className="text-echo-muted mb-6 max-w-md mx-auto leading-relaxed">
              Sign a message with your wallet to prove ownership. This is free and won't trigger any blockchain transaction.
            </p>
            <div className="bg-arena-bg border border-echo-magenta/30 rounded-lg p-4 mb-6 font-mono text-sm">
              <div className="text-xs text-echo-muted uppercase mb-1">WALLET ADDRESS</div>
              <div className="text-echo-text">{address}</div>
            </div>
            <PillButton
              onClick={handleAuthenticate}
              variant="primary"
              size="lg"
              disabled={isAuthenticating}
            >
              {isAuthenticating ? 'SIGNING...' : '⚡ SIGN MESSAGE'}
            </PillButton>
          </div>
        )}

        {step === 'prompt' && (
          <div className="space-y-6">
            {/* Eligibility Status */}
            <div className="card-arena">
              {eligibilityCheck?.eligible ? (
                <div className="flex items-center gap-3 text-neon-green">
                  <span className="text-2xl">✓</span>
                  <div>
                    <div className="font-orbitron font-bold tracking-wide">FREE SPAWN AVAILABLE</div>
                    <div className="text-sm text-echo-muted">Week 1 - No burn required!</div>
                  </div>
                </div>
              ) : burnCheck?.hasVerifiedBurn ? (
                <div className="flex items-center gap-3 text-neon-green">
                  <span className="text-2xl">✓</span>
                  <div>
                    <div className="font-orbitron font-bold tracking-wide">BURN VERIFIED</div>
                    <div className="text-sm text-echo-muted">You're eligible to spawn!</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-echo-gold">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <div className="font-orbitron font-bold tracking-wide">ENTRY REQUIRES BURN</div>
                    <div className="text-sm text-echo-muted">
                      {eligibilityCheck?.reason === 'Free spawn already used'
                        ? 'You already used your free spawn this week'
                        : `${burnPrice?.requiredEchoAmount || '...'} $ECHO (${burnPrice?.requiredBurnBNB || 0.01} BNB equivalent)`
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bot Name Input */}
            <div className="card-arena">
              <label className="block text-sm font-orbitron font-semibold mb-3 text-echo-cyan tracking-wide uppercase">
                Bot Name (required, 3-50 characters, must be unique)
              </label>
              <input
                type="text"
                className="input-arena w-full font-mono"
                placeholder="Example: Momentum Hunter, Volume Sniper, Alpha Trader"
                value={botName}
                onChange={(e) => setBotName(e.target.value.slice(0, 50))}
                maxLength={50}
              />
              <div className="text-sm text-echo-muted mt-2 font-mono">
                {botName.length} / 50 characters
                {botName.length > 0 && botName.length < 3 && (
                  <span className="text-echo-gold ml-2">⚠ Minimum 3 characters</span>
                )}
              </div>
            </div>

            {/* Prompt Input */}
            <div className="card-arena">
              <label className="block text-sm font-orbitron font-semibold mb-3 text-echo-cyan tracking-wide uppercase">
                Strategy Prompt (max 500 characters)
              </label>
              <textarea
                className="input-arena w-full h-32 resize-none font-mono"
                placeholder="Example: Buy momentum tokens with liquidity > 50 BNB, take profit at 20%, stop loss at 15%, max 3 positions"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
              />
              <div className="text-sm text-echo-muted mt-2 font-mono">
                {prompt.length} / 500 characters
              </div>
            </div>

            {/* Preview DSL */}
            {previewDSL && (
              <div className="card-arena border-echo-cyan/50 shadow-neon-cyan">
                <h3 className="font-orbitron font-bold mb-4 text-echo-cyan tracking-wide uppercase">
                  ⚡ Parsed Strategy
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {dslToChips(previewDSL).map((chip, i) => (
                    <span
                      key={i}
                      className={`px-3 py-1 rounded-full text-sm border border-echo-${chip.color === 'purple' ? 'magenta' : chip.color} text-echo-${chip.color === 'purple' ? 'magenta' : chip.color} bg-echo-${chip.color === 'purple' ? 'magenta' : chip.color}/10 font-mono`}
                    >
                      {chip.label}
                    </span>
                  ))}
                </div>
                <pre className="text-xs text-echo-muted overflow-auto bg-arena-bg p-4 rounded-lg border border-echo-magenta/20 font-mono">
                  {JSON.stringify(previewDSL, null, 2)}
                </pre>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <PillButton
                onClick={handlePreview}
                variant="primary"
                size="lg"
                className="flex-1"
                disabled={prompt.length === 0}
              >
                PREVIEW STRATEGY
              </PillButton>
              <PillButton
                onClick={handleCreate}
                variant="primary"
                size="lg"
                className="flex-1"
                disabled={!previewDSL || createBotMutation.isPending || botName.trim().length < 3}
              >
                {createBotMutation.isPending
                  ? 'CREATING...'
                  : eligibilityCheck?.eligible || burnCheck?.hasVerifiedBurn
                    ? '⚡ SPAWN BOT'
                    : '🔥 BURN & ENTER'}
              </PillButton>
            </div>
          </div>
        )}

        {step === 'burn' && (
          <div className="card-arena">
            <h2 className="text-2xl font-orbitron font-bold mb-6 text-echo-cyan uppercase tracking-wide">
              🔥 BURN $ECHO TOKENS
            </h2>
            <p className="text-echo-muted mb-4">
              Send <span className="text-echo-magenta font-bold">{burnPrice?.requiredEchoAmount} $ECHO</span> to the burn address:
            </p>
            <div className="bg-arena-bg border border-echo-magenta/30 p-4 rounded-lg mb-6 font-mono text-sm break-all text-echo-text">
              0x000000000000000000000000000000000000dEaD
            </div>
            <p className="text-sm text-echo-gold mb-6 flex items-center gap-2">
              <span>⚠️</span>
              <span>After transaction confirms, paste the tx hash below to verify.</span>
            </p>
            <input
              type="text"
              placeholder="0x..."
              className="input-arena w-full mb-4 font-mono"
              id="txHashInput"
            />
            <PillButton
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
              variant="primary"
              size="lg"
              className="w-full"
              disabled={verifyBurnMutation.isPending}
            >
              {verifyBurnMutation.isPending ? 'VERIFYING...' : '✓ VERIFY & CREATE BOT'}
            </PillButton>
          </div>
        )}

        {step === 'success' && (
          <div className="card-arena text-center border-neon-green/50 shadow-neon-green">
            <div className="flex justify-center mb-6">
              <Image
                src="/icons/BotSpawned.png"
                alt="Bot Spawned"
                width={150}
                height={150}
                className="object-contain"
              />
            </div>
            <h2 className="text-3xl font-orbitron font-bold mb-4 text-neon-green uppercase tracking-wider">
              BOT SPAWNED!
            </h2>
            <p className="text-echo-muted mb-8 max-w-md mx-auto leading-relaxed">
              Your bot has been created and will enter the arena shortly.
            </p>
            <div className="inline-block rounded-full bg-gradient-to-r from-echo-magenta to-echo-cyan p-[2px]">
              <Link
                href="/arena"
                className="block rounded-full bg-arena-surface px-8 py-4 text-lg font-orbitron font-semibold tracking-wide uppercase text-echo-cyan transition-all duration-300 hover:bg-gradient-to-r hover:from-echo-magenta/10 hover:to-echo-cyan/10"
              >
                ⚡ VIEW ARENA
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
