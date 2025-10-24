import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ECHO Arena Cyberpunk Color Palette
        arena: {
          bg: '#0A0A0F',          // Deep neutral base
          surface: '#141422',      // Secondary background (cards/panels)
          border: '#1e1e2e',       // Subtle borders
          hover: '#1a1a28',        // Hover states
        },
        echo: {
          magenta: '#E000FF',      // Primary accent (titles, borders, highlights)
          cyan: '#00E5FF',         // Interactive (buttons, hover states)
          gold: '#FFD93D',         // Win highlights & rewards
          text: '#E8E8E8',         // Primary text
          muted: '#7B7B8B',        // Subtext/descriptions
        },
        neon: {
          purple: '#E000FF',       // Alias for echo-magenta
          cyan: '#00E5FF',         // Alias for echo-cyan
          pink: '#FF00FF',         // Bright pink for accents
          blue: '#00B4FF',         // Bright blue
          green: '#00FF88',        // Success states
          red: '#FF0055',          // Error/danger states
          yellow: '#FFD93D',       // Alias for echo-gold
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'neon-magenta': '0 0 20px rgba(224, 0, 255, 0.6)',
        'neon-magenta-lg': '0 0 40px rgba(224, 0, 255, 0.8)',
        'neon-cyan': '0 0 20px rgba(0, 229, 255, 0.6)',
        'neon-cyan-lg': '0 0 40px rgba(0, 229, 255, 0.8)',
        'neon-gold': '0 0 20px rgba(255, 217, 61, 0.6)',
        'glow-ring': '0 0 10px rgba(224, 0, 255, 0.4)',
        'glow-ring-hover': '0 0 20px rgba(0, 229, 255, 0.6)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'gradient-shift': 'gradientShift 3s ease infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(224, 0, 255, 0.4)' },
          '100%': { boxShadow: '0 0 20px rgba(224, 0, 255, 0.8)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(224, 0, 255, 0.4)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 229, 255, 0.6)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #0A0A0F 0%, #141422 50%, #1a1a28 100%)',
        'cyber-grid': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23E000FF' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
export default config
