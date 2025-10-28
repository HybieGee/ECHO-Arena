/**
 * Whitepaper page
 * Technical documentation, roadmap, and tokenomics
 */

'use client';

import Image from 'next/image';

export default function WhitepaperPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 neon-text">
          ECHO ARENA WHITEPAPER
        </h1>
        <p className="text-xl text-gray-400">
          Decentralized AI Trading Competition on BSC
        </p>
        <p className="text-sm text-gray-500 mt-2">Version 1.0 - October 2025</p>
      </div>

      {/* Executive Summary */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-4 text-neon-cyan">Executive Summary</h2>
        <div className="card-arena p-6">
          <p className="text-gray-300 mb-4">
            ECHO Arena is a fully on-chain AI trading competition where users create autonomous trading bots
            using natural language prompts. Bots compete in 24-hour matches, trading real BSC meme tokens
            with a simulated balance of 1 BNB. Winners receive BNB prizes based on performance.
          </p>
          <p className="text-gray-300">
            Built on Binance Smart Chain with Cloudflare Workers for deterministic simulation,
            ECHO Arena combines DeFi trading strategies with competitive gaming mechanics.
          </p>
        </div>
      </section>

      {/* Technical Architecture */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-4 text-neon-cyan">Technical Architecture</h2>
        <div className="card-arena p-6">
          <h3 className="text-xl font-semibold mb-3 text-echo-magenta">Smart Contract Layer</h3>
          <ul className="list-disc list-inside mb-4 text-gray-300 space-y-2">
            <li>
              <strong>ECHO Token (BSC):</strong> ERC-20 token with burn mechanics for entry
            </li>
            <li>
              <strong>Burn Verification:</strong> On-chain proof of burn via event logs
            </li>
            <li>
              <strong>Prize Distribution:</strong> Automated BNB payouts to winners
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 text-echo-magenta mt-6">Simulation Engine</h3>
          <ul className="list-disc list-inside mb-4 text-gray-300 space-y-2">
            <li>
              <strong>Cloudflare Durable Objects:</strong> Deterministic state management
            </li>
            <li>
              <strong>Strategy DSL:</strong> Domain-specific language for bot configuration
            </li>
            <li>
              <strong>Real Market Data:</strong> Live BSC token prices from GeckoTerminal API
            </li>
            <li>
              <strong>Fair Execution:</strong> Deterministic ordering, 0.25% fees, 10bps slippage
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 text-echo-magenta mt-6">AI Prompt Parser</h3>
          <ul className="list-disc list-inside mb-4 text-gray-300 space-y-2">
            <li>
              <strong>Claude 3.5 Sonnet:</strong> Natural language to strategy conversion
            </li>
            <li>
              <strong>Rule-Based Fallback:</strong> Pattern matching for offline parsing
            </li>
            <li>
              <strong>Zod Validation:</strong> Type-safe strategy schemas
            </li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 text-echo-magenta mt-6">Code Verification</h3>
          <div className="bg-arena-bg p-4 rounded border border-arena-border">
            <p className="text-gray-300 mb-2">
              <strong>Smart Contract:</strong> Verified on BSCScan
            </p>
            <p className="text-gray-300">
              <strong>Audit Status:</strong> Community reviewed, formal audit Q1 2026
            </p>
          </div>
        </div>
      </section>

      {/* Tokenomics */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-4 text-neon-cyan">Tokenomics</h2>
        <div className="card-arena p-6">
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-echo-magenta">Distribution</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-arena-bg rounded">
                  <span className="text-gray-300">Community</span>
                  <span className="text-2xl font-bold text-neon-green">95%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-arena-bg rounded">
                  <span className="text-gray-300">Dev Team</span>
                  <span className="text-2xl font-bold text-neon-cyan">5%</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3 text-echo-magenta">Dev Team Breakdown (5%)</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-arena-bg rounded">
                  <span className="text-gray-300 flex items-center gap-2">
                    <Image src="/icons/FutureFunding.png" alt="Future Funding" width={20} height={20} className="object-contain" />
                    Future Funding (Locked)
                  </span>
                  <span className="font-semibold text-neon-cyan">3%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-arena-bg rounded">
                  <span className="text-gray-300 flex items-center gap-2">
                    <Image src="/icons/CommunityRewards.png" alt="Community Rewards" width={20} height={20} className="object-contain" />
                    Community Rewards
                  </span>
                  <span className="font-semibold text-neon-cyan">1%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-arena-bg rounded">
                  <span className="text-gray-300 flex items-center gap-2">
                    <Image src="/icons/Marketing.png" alt="Marketing" width={20} height={20} className="object-contain" />
                    Marketing
                  </span>
                  <span className="font-semibold text-neon-cyan">0.5%</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-arena-bg rounded">
                  <span className="text-gray-300 flex items-center gap-2">
                    <Image src="/icons/DevTeam.png" alt="Dev Team" width={20} height={20} className="object-contain" />
                    Dev Team
                  </span>
                  <span className="font-semibold text-neon-cyan">0.5%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-arena-bg rounded border border-neon-cyan/30">
            <p className="text-gray-300 text-sm">
              <strong className="text-neon-cyan">Note:</strong> A visual tokenomics graphic
              will be added soon to illustrate the distribution breakdown.
            </p>
          </div>

          <h3 className="text-xl font-semibold mb-3 text-echo-magenta mt-6">Burn Mechanics</h3>
          <ul className="list-disc list-inside text-gray-300 space-y-2">
            <li>Entry to matches requires burning ECHO tokens</li>
            <li>Burned tokens are permanently removed from circulation</li>
            <li>Free entry available during promotional periods</li>
            <li>Deflationary model increases scarcity over time</li>
          </ul>
        </div>
      </section>

      {/* Roadmap */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-4 text-neon-cyan">Roadmap</h2>

        {/* Q4 2025 */}
        <div className="card-arena p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-neon-green rounded-full animate-pulse"></div>
            <h3 className="text-2xl font-bold text-neon-green">Q4 2025 - Launch Phase</h3>
            <span className="text-sm text-gray-400">(Current)</span>
          </div>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-neon-green mt-1">✓</span>
              <span>MVP Launch - Core trading simulation and bot creation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neon-green mt-1">✓</span>
              <span>BSC Integration - Real-time token data from four.meme and DEXes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-neon-green mt-1">✓</span>
              <span>AI Prompt Parser - Claude-powered strategy interpretation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-echo-magenta mt-1">◉</span>
              <span>Community Building - Discord, Twitter, partnerships</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-echo-magenta mt-1">◉</span>
              <span>First Match Season - Weekly competitions with BNB prizes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-echo-magenta mt-1">◉</span>
              <span>Marketing Campaign - Influencer partnerships, AMAs</span>
            </li>
          </ul>
        </div>

        {/* Q1 2026 */}
        <div className="card-arena p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-neon-cyan rounded-full"></div>
            <h3 className="text-2xl font-bold text-neon-cyan">Q1 2026 - Growth Phase</h3>
          </div>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">○</span>
              <span>Smart Contract Audit - Professional security review</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">○</span>
              <span>Advanced Bot Strategies - ML-based signal processing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">○</span>
              <span>Leaderboard Seasons - Ranked competitive tiers</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">○</span>
              <span>Mobile App - iOS and Android trading bot management</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">○</span>
              <span>Tournament Mode - Multi-round elimination brackets</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">○</span>
              <span>CEX Listings - Major exchange partnerships</span>
            </li>
          </ul>
        </div>

        {/* Q2 2026 */}
        <div className="card-arena p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-echo-magenta rounded-full"></div>
            <h3 className="text-2xl font-bold text-echo-magenta">Q2 2026 - Expansion Phase</h3>
          </div>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">○</span>
              <span>Multi-Chain Support - Ethereum, Arbitrum, Base integration</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">○</span>
              <span>Team Battles - Guild-based competitive matches</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">○</span>
              <span>Strategy Marketplace - Buy/sell proven bot strategies</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">○</span>
              <span>Governance Launch - DAO voting on match rules and prizes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">○</span>
              <span>API Access - Developer integrations and custom frontends</span>
            </li>
          </ul>
        </div>

        {/* Q3 2026 */}
        <div className="card-arena p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <h3 className="text-2xl font-bold text-gray-300">Q3 2026 - Ecosystem Phase</h3>
          </div>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">○</span>
              <span>Real Money Trading - Optional real BNB competitions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">○</span>
              <span>Sponsorship Program - Brand partnerships for prize pools</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">○</span>
              <span>Educational Hub - Trading tutorials and strategy guides</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">○</span>
              <span>Esports Integration - Live streamed championship events</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">○</span>
              <span>AI Model Upgrades - GPT-5/Claude 4 integration</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-500 mt-1">○</span>
              <span>Global Expansion - Multi-language support, regional tournaments</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Risk Disclaimer */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-4 text-neon-cyan">Risk Disclaimer</h2>
        <div className="card-arena p-6 bg-red-950/20 border-red-500/30">
          <p className="text-gray-300 mb-3">
            <strong className="text-red-400">Important:</strong> ECHO Arena is a simulation-based
            competition. Bots trade with virtual balances only. No real trading occurs.
          </p>
          <p className="text-gray-300 mb-3">
            Cryptocurrency investments carry risk. Only participate with funds you can afford to lose.
            Past performance does not guarantee future results.
          </p>
          <p className="text-gray-300">
            This whitepaper is for informational purposes only and does not constitute financial advice.
            Do your own research before participating.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section>
        <h2 className="text-3xl font-bold mb-4 text-neon-cyan">Contact & Community</h2>
        <div className="card-arena p-6">
          <div className="flex justify-center">
            <div className="p-6 rounded">
              <div className="flex justify-center mb-3">
                <Image
                  src="/icons/xLogo.png"
                  alt="X (Twitter)"
                  width={60}
                  height={60}
                  className="object-contain"
                />
              </div>
              <div className="text-gray-400 text-sm mb-2 text-center">Follow us on Twitter</div>
              <div className="text-neon-cyan text-xl font-semibold text-center">@EchoArenaOnline</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center mt-12 text-gray-500 text-sm">
        <p>© 2025 ECHO Arena. All rights reserved.</p>
        <p className="mt-2">Version 1.0 - Last Updated: October 2025</p>
      </div>
    </div>
  );
}
