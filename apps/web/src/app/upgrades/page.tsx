/**
 * Upgrades page
 * Premium features and upgrades (Coming Soon)
 */

'use client';

import { useAccount } from 'wagmi';
import Image from 'next/image';

export default function UpgradesPage() {
  const { isConnected } = useAccount();

  const upgrades = [
    {
      id: 'ai-models',
      title: 'Premium AI Models',
      description: 'Choose from advanced AI models to power your bot strategies',
      features: [
        'GPT-4 Turbo - Advanced reasoning',
        'Claude Opus - Superior analysis',
        'Gemini Pro - Multi-modal insights',
        'Custom model fine-tuning',
      ],
      price: 'COMING SOON',
      badge: 'COMING SOON',
    },
    {
      id: 'real-mode',
      title: 'Real Money Mode',
      description: 'Compete with real BNB in high-stakes jackpot matches',
      features: [
        'Trade with actual BNB balance',
        'Winner-takes-all jackpot pool',
        'Higher prize multipliers',
        'Exclusive tournaments',
      ],
      price: 'COMING SOON',
      badge: 'COMING SOON',
      highlight: true,
    },
    {
      id: 'char-limit',
      title: 'Extended Prompts',
      description: 'Unlock longer strategy descriptions for complex bots',
      features: [
        '500 → 2000 character limit',
        'More detailed trading logic',
        'Advanced multi-condition rules',
        'Better AI interpretation',
      ],
      price: 'COMING SOON',
      badge: 'COMING SOON',
    },
    {
      id: 'bot-slots',
      title: 'Additional Bot Slots',
      description: 'Create and manage more bots simultaneously',
      features: [
        '+5 bot slots per purchase',
        'Run multiple strategies at once',
        'A/B test different approaches',
        'Stackable (buy multiple times)',
      ],
      price: 'COMING SOON',
      badge: 'COMING SOON',
    },
    {
      id: 'scan-boost',
      title: 'Priority Scanning',
      description: 'Get faster market scans and trade execution',
      features: [
        '2x scan frequency (30-60s)',
        'Priority queue for trades',
        'Earlier access to new tokens',
        'Reduced latency simulation',
      ],
      price: 'COMING SOON',
      badge: 'COMING SOON',
    },
    {
      id: 'analytics',
      title: 'Advanced Analytics',
      description: 'Deep insights into your bot performance',
      features: [
        'Detailed trade breakdowns',
        'Strategy effectiveness scoring',
        'Market correlation analysis',
        'Export historical data',
      ],
      price: 'COMING SOON',
      badge: 'COMING SOON',
    },
  ];

  return (
    <div className="container-arena py-12 relative">
      {/* Blurred Content */}
      <div className="blur-sm pointer-events-none select-none">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-orbitron font-bold mb-4 text-echo-cyan uppercase tracking-wider">
            UPGRADES
          </h1>
          <p className="text-xl text-echo-muted max-w-2xl mx-auto">
            Enhance your trading bots with premium features and advanced capabilities
          </p>
        </div>

        {/* Coming Soon Banner */}
        <div className="card-arena p-6 mb-8 bg-gradient-to-r from-echo-magenta/10 to-echo-cyan/10 border-echo-cyan/50">
          <div className="flex items-center justify-center gap-4">
            <div>
              <h2 className="text-2xl font-orbitron font-bold text-echo-cyan mb-2">
                PREMIUM FEATURES LAUNCHING SOON
              </h2>
              <p className="text-echo-muted">
                We're building the next generation of bot upgrades. Stay tuned for announcements on our social channels!
              </p>
            </div>
          </div>
        </div>

        {/* Upgrades Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {upgrades.map((upgrade) => (
            <div
              key={upgrade.id}
              className={`card-arena p-6 relative overflow-hidden transition-all duration-300 hover:shadow-neon-cyan ${
                upgrade.highlight ? 'border-echo-gold/50 shadow-neon-gold' : ''
              }`}
            >
              {/* Coming Soon Badge */}
              <div className="absolute top-4 right-4 bg-gradient-to-r from-echo-magenta to-echo-cyan px-3 py-1 rounded-full text-xs font-bold tracking-wider">
                {upgrade.badge}
              </div>

              {/* Title */}
              <div className="mb-4">
                <h3 className="text-2xl font-orbitron font-bold text-echo-cyan mb-2">
                  {upgrade.title}
                </h3>
                <p className="text-sm text-echo-muted">{upgrade.description}</p>
              </div>

              {/* Features */}
              <div className="mb-6">
                <div className="text-xs text-echo-muted uppercase tracking-wide mb-2">
                  Features:
                </div>
                <ul className="space-y-2">
                  {upgrade.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-neon-green mt-0.5">✓</span>
                      <span className="text-echo-text">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Price & Button */}
              <div className="border-t border-echo-magenta/20 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs text-echo-muted uppercase">Price</div>
                  <div className="text-sm font-bold text-echo-gold">{upgrade.price}</div>
                </div>
                <button
                  disabled
                  className="w-full py-3 rounded-lg bg-arena-surface border border-echo-muted/30 text-echo-muted cursor-not-allowed font-orbitron font-semibold tracking-wide uppercase"
                >
                  Coming Soon
                </button>
              </div>

              {/* Highlight Glow */}
              {upgrade.highlight && (
                <div className="absolute inset-0 bg-gradient-to-br from-echo-gold/5 to-transparent pointer-events-none" />
              )}
            </div>
          ))}
        </div>

        {/* Bundle Deals Section */}
        <div className="card-arena p-8 bg-gradient-to-br from-echo-magenta/5 to-echo-cyan/5 border-echo-cyan/30">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-orbitron font-bold text-echo-cyan mb-3">
              BUNDLE DEALS
            </h2>
            <p className="text-echo-muted">
              Save big with upgrade bundles (Coming Soon)
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Starter Pack */}
            <div className="bg-arena-surface rounded-lg p-6 border border-echo-magenta/30">
              <div className="text-center mb-4">
                <h3 className="text-xl font-orbitron font-bold text-neon-green mb-1">
                  STARTER PACK
                </h3>
                <div className="text-sm text-echo-muted mb-3">Perfect for beginners</div>
                <div className="text-lg font-bold text-echo-gold">COMING SOON</div>
              </div>
              <ul className="space-y-2 text-sm mb-4">
                <li className="flex items-center gap-2">
                  <span className="text-neon-green">✓</span>
                  <span>Extended Prompts</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neon-green">✓</span>
                  <span>+5 Bot Slots</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neon-green">✓</span>
                  <span>Advanced Analytics</span>
                </li>
              </ul>
            </div>

            {/* Pro Pack */}
            <div className="bg-arena-surface rounded-lg p-6 border-2 border-echo-cyan/50 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-echo-magenta to-echo-cyan px-4 py-1 rounded-full text-xs font-bold">
                POPULAR
              </div>
              <div className="text-center mb-4">
                <h3 className="text-xl font-orbitron font-bold text-echo-cyan mb-1">
                  PRO PACK
                </h3>
                <div className="text-sm text-echo-muted mb-3">For serious traders</div>
                <div className="text-lg font-bold text-echo-gold">COMING SOON</div>
              </div>
              <ul className="space-y-2 text-sm mb-4">
                <li className="flex items-center gap-2">
                  <span className="text-neon-green">✓</span>
                  <span>Premium AI Models</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neon-green">✓</span>
                  <span>Extended Prompts</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neon-green">✓</span>
                  <span>+10 Bot Slots</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neon-green">✓</span>
                  <span>Priority Scanning</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neon-green">✓</span>
                  <span>Advanced Analytics</span>
                </li>
              </ul>
            </div>

            {/* Elite Pack */}
            <div className="bg-arena-surface rounded-lg p-6 border border-echo-gold/50">
              <div className="text-center mb-4">
                <h3 className="text-xl font-orbitron font-bold text-echo-gold mb-1">
                  ELITE PACK
                </h3>
                <div className="text-sm text-echo-muted mb-3">Ultimate experience</div>
                <div className="text-lg font-bold text-echo-gold">COMING SOON</div>
              </div>
              <ul className="space-y-2 text-sm mb-4">
                <li className="flex items-center gap-2">
                  <span className="text-neon-green">✓</span>
                  <span>All Upgrades Included</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neon-green">✓</span>
                  <span>Real Money Mode Access</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neon-green">✓</span>
                  <span>Unlimited Bot Slots</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neon-green">✓</span>
                  <span>VIP Discord Channel</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-neon-green">✓</span>
                  <span>Early Feature Access</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 card-arena p-6">
          <h2 className="text-2xl font-orbitron font-bold text-echo-cyan mb-6">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-echo-text mb-2">
                When will upgrades be available?
              </h3>
              <p className="text-echo-muted">
                We're actively developing premium features and plan to launch in Q1 2026.
                Follow our Twitter for early access announcements.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-echo-text mb-2">
                Will upgrades be permanent or subscription-based?
              </h3>
              <p className="text-echo-muted">
                Most upgrades will be one-time purchases with permanent access. Real Money Mode
                may require periodic entry fees for jackpot tournaments.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-echo-text mb-2">
                Can I get a refund if I'm not satisfied?
              </h3>
              <p className="text-echo-muted">
                Due to the nature of blockchain transactions and token burns, all purchases are final.
                We'll offer trial periods for certain features before purchase.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-echo-text mb-2">
                How do I earn $ECHO tokens to purchase upgrades?
              </h3>
              <p className="text-echo-muted">
                Compete in matches, refer friends, participate in community events, or purchase $ECHO
                on decentralized exchanges. Winners receive BNB prizes which can be swapped for $ECHO.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Overlay (centered on top of blur) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="card-arena p-12 max-w-2xl text-center bg-arena-surface/95 backdrop-blur-sm border-echo-cyan shadow-2xl">
          <h2 className="text-6xl font-orbitron font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-echo-magenta via-echo-cyan to-neon-green uppercase tracking-wider">
            COMING SOON
          </h2>
          <p className="text-xl text-echo-text mb-6 leading-relaxed">
            Premium upgrades and features are currently in development
          </p>
          <div className="text-echo-muted">
            <p className="mb-2">Stay tuned for launch announcements</p>
            <p className="text-sm">Follow us on Twitter for early access</p>
          </div>
        </div>
      </div>
    </div>
  );
}
