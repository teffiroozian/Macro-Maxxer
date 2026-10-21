import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Keep generated output out of lint while retaining all authored source.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Static web assets copied by Capacitor and native build/dependency output:
    "ios/App/App/public/**",
    "ios/**/build/**",
    "ios/**/DerivedData/**",
    "ios/**/Pods/**",
    "ios/capacitor-cordova-ios-plugins/**",
    // Test/deployment output and generated design-sync bundles/caches:
    "coverage/**",
    ".vercel/output/**",
    "ds-bundle/**",
    ".ds-sync/**",
    ".design-sync/.cache/**",
    ".design-sync/learnings/**",
  ]),
]);

export default eslintConfig;
