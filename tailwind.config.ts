import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        stellar: {
          blue: '#0070F3',
          purple: '#7928CA',
          cyan: '#00B4D8',
          dark: '#0A0A0A',
          card: '#111111',
          border: '#222222',
          muted: '#888888',
        },
      },
      backgroundImage: {
        'gradient-stellar': 'linear-gradient(135deg, #0070F3 0%, #7928CA 100%)',
        'gradient-card': 'linear-gradient(145deg, #111111 0%, #0A0A0A 100%)',
        'gradient-glow': 'radial-gradient(circle at 50% 50%, rgba(0, 112, 243, 0.15) 0%, transparent 70%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 112, 243, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 112, 243, 0.6), 0 0 40px rgba(121, 40, 202, 0.3)' },
        },
      },
      boxShadow: {
        'stellar': '0 0 20px rgba(0, 112, 243, 0.2)',
        'stellar-hover': '0 0 40px rgba(0, 112, 243, 0.4)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
