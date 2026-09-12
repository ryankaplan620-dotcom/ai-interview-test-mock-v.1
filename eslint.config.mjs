import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...nextCoreWebVitals,
  {
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // eslint-plugin-react-hooks v7 (pulled in by eslint-config-next 16's
    // "recommended" preset) adds a large set of new React Compiler
    // readiness rules beyond the previous rules-of-hooks/exhaustive-deps
    // pair. Downgrading them to warnings preserves this codebase's prior
    // lint behavior across the Next.js 14 -> 16 upgrade instead of forcing
    // an unrelated, wide-reaching React Compiler compliance pass.
    rules: {
      "react-hooks/static-components": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/incompatible-library": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/globals": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/unsupported-syntax": "warn",
      "react-hooks/config": "warn",
      "react-hooks/gating": "warn",
    },
  },
];

export default eslintConfig;
