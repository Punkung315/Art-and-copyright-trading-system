import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This project intentionally fetches data on mount via a named
      // `load()`/`refresh()` helper (`useEffect(() => { load(); }, [])`) so the
      // same function can be re-invoked after mutations (e.g. after approving a
      // seller or confirming a payment) without duplicating the fetch logic.
      // The new react-hooks rule can't statically see that the helper only
      // calls setState with fresh server data, so it flags a false positive.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
