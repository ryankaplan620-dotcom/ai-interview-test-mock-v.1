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
        // ------ Brand accent: Folio Mint (sampled from brand deck) ------
        accent: {
          DEFAULT: "#63D88A",
          deep: "#41B06C",
          mid: "#57CB81",
          soft: "#D9F6E5",
          highlight: "#82E8A5",
        },
        // ------ Marketing brand mint (light surfaces) ------
        // Calibrated for white backgrounds — deeper than `accent`
        // so it holds contrast and pairs with near-black ink text.
        brand: {
          50: "#EFFBF4",
          100: "#D9F6E5",
          200: "#B5ECCD",
          300: "#8AE0B0",
          400: "#63D88A",
          500: "#3FC579",
          600: "#2FA563",
          700: "#268751",
          800: "#1E6B41",
          900: "#174F31",
          DEFAULT: "#3FC579",
          ink: "#07140C", // near-black text for use on top of brand fills
        },
        // ------ Secondary accent: Intelligence Violet (brand deck) ------
        violet: {
          DEFAULT: "#885DEB",
          deep: "#5B3DB8",
          dim: "#352A5A",
          soft: "#EDE6FC",
        },
        // ------ Cover canvas: Cosmos indigo (brand deck p.1) ------
        cosmos: {
          DEFAULT: "#0D042B",
          deep: "#070217",
          soft: "#1A0F45",
        },
        // ------ Cool premium canvas (page background) + white cards ------
        canvas: {
          DEFAULT: "#F7F8FA",
          tint: "#EDEFF3",
        },
        // ------ Canvas: Ink dark (brand deck interior) ------
        ink: {
          DEFAULT: "#0E1116",
          deeper: "#08090D",
          surface: "#151923",
          raised: "#1B2029",
          border: "#2A3039",
        },
        // ------ Canvas: Paper light ------
        paper: {
          DEFAULT: "#FAFBFC",
          elevated: "#FFFFFF",
        },
        // ------ Text hierarchy ------
        text: {
          primary: "#F2F4F8",
          secondary: "#A6ADBB",
          tertiary: "#6E7480",
          onLight: "#15181E",
          onAccent: "#07140C",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Open Sauce Two", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "Open Sauce One", "system-ui", "sans-serif"],
        // Brand voice has no serif — italic accents render in Open Sauce One italic.
        serif: ["var(--font-sans)", "Open Sauce One", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "'JetBrains Mono'", "Consolas", "monospace"],
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
        "ambient-glow": "radial-gradient(circle at 78% 32%, rgba(99,216,138,0.12) 0%, rgba(99,216,138,0.04) 40%, transparent 80%)",
        "depth-glow": "radial-gradient(circle at 15% 85%, rgba(99,216,138,0.05) 0%, transparent 50%)",
        "cta-gradient": "linear-gradient(180deg, #82E8A5 0%, #63D88A 100%)",
        // Wordmark treatment from the brand deck — mint fading into the dark
        "wordmark-fade": "linear-gradient(180deg, #82E8A5 0%, #51AF77 55%, rgba(81,175,119,0.0) 130%)",
        "violet-statement": "linear-gradient(180deg, #352A5A 0%, #885DEB 100%)",
      },
      boxShadow: {
        "accent-glow": "0 0 40px 0 rgba(99,216,138,0.15)",
        "accent-glow-lg": "0 0 80px 0 rgba(99,216,138,0.22)",
        // ------ Light/marketing elevation system ------
        card: "0 1px 2px 0 rgba(16,24,40,0.04), 0 1px 3px 0 rgba(16,24,40,0.05)",
        "card-hover": "0 18px 40px -16px rgba(16,24,40,0.20)",
        elevated: "0 24px 64px -24px rgba(16,24,40,0.24)",
        frame: "0 32px 80px -32px rgba(16,24,40,0.28)",
        "brand-glow": "0 10px 34px -10px rgba(63,197,121,0.45)",
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
