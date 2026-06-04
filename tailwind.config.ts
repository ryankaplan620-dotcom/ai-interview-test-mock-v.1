import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ------ Brand accent: Electric Emerald ------
        accent: {
          DEFAULT: "#00F590",
          deep: "#00D478",
          mid: "#00E685",
          soft: "#C8FAE1",
          highlight: "#33FAA6",
        },
        // ------ Marketing brand emerald (light surfaces) ------
        // Calibrated for white backgrounds — slightly deeper than `accent`
        // so it holds contrast and pairs with near-black ink text.
        brand: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#00DC82",
          600: "#00C574",
          700: "#00A862",
          800: "#047857",
          900: "#064E3B",
          DEFAULT: "#00DC82",
          ink: "#04140D", // near-black text for use on top of brand fills
        },
        // ------ Canvas: Ink-navy dark ------
        ink: {
          DEFAULT: "#0D1117",
          deeper: "#07090C",
          surface: "#161B22",
          raised: "#1C2128",
          border: "#2A3139",
        },
        // ------ Canvas: Paper light ------
        paper: {
          DEFAULT: "#FAFAF7",
          elevated: "#FFFFFF",
        },
        // ------ Text hierarchy ------
        text: {
          primary: "#F0F6FC",
          secondary: "#A8B0BA",
          tertiary: "#6E7681",
          onLight: "#1A1F24",
          onAccent: "#0D1117",
        },
      },
      fontFamily: {
        display: ["var(--font-inter-display)", "Inter", "Söhne", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "Inter", "Söhne", "system-ui", "sans-serif"],
        serif: ["Georgia", "'Times New Roman'", "serif"],
        mono: ["var(--font-jetbrains-mono)", "'JetBrains Mono'", "Consolas", "monospace"],
        // Wordmark-style serifs for the proof row
        wordmark: {
          cinzel: ["var(--font-cinzel)", "Georgia", "serif"],
          playfair: ["var(--font-playfair)", "Georgia", "serif"],
          spectral: ["var(--font-spectral)", "Georgia", "serif"],
          crimson: ["var(--font-crimson)", "Georgia", "serif"],
        } as never,
      },
      letterSpacing: {
        display: "-0.035em",
        heading: "-0.025em",
        body: "-0.01em",
        label: "0.22em",
      },
      spacing: {
        // 8px baseline grid tokens
        "0.25": "0.0625rem",
        "4.5": "1.125rem",
        "13": "3.25rem",
        "18": "4.5rem",
      },
      transitionTimingFunction: {
        brand: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        settle: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      backgroundImage: {
        "ambient-glow": "radial-gradient(circle at 78% 32%, rgba(0,245,144,0.12) 0%, rgba(0,245,144,0.04) 40%, transparent 80%)",
        "depth-glow": "radial-gradient(circle at 15% 85%, rgba(0,245,144,0.05) 0%, transparent 50%)",
        "cta-gradient": "linear-gradient(180deg, #33FAA6 0%, #00F590 100%)",
      },
      boxShadow: {
        "accent-glow": "0 0 40px 0 rgba(0,245,144,0.15)",
        "accent-glow-lg": "0 0 80px 0 rgba(0,245,144,0.20)",
        // ------ Light/marketing elevation system ------
        card: "0 1px 2px 0 rgba(16,24,40,0.04), 0 1px 3px 0 rgba(16,24,40,0.05)",
        "card-hover": "0 18px 40px -16px rgba(16,24,40,0.20)",
        elevated: "0 24px 64px -24px rgba(16,24,40,0.24)",
        frame: "0 32px 80px -32px rgba(16,24,40,0.28)",
        "brand-glow": "0 10px 34px -10px rgba(0,220,130,0.45)",
      },
      animation: {
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "waveform": "waveform 0.8s ease-in-out infinite",
        "marquee": "marquee 30s linear infinite",
      },
      keyframes: {
        "pulse-ring": {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "0.3", transform: "scale(1.3)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "waveform": {
          "0%, 100%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1)" },
        },
        "marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
