import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "JSXAttribute[name.name='className'] Literal[value=/\\b(?:rounded|shadow|border|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap)-\\[[^\"]+\\]/]",
          message:
            "Prefer shared style tokens (see docs/style-tokens.md) over arbitrary Tailwind values for spacing/radius/border/shadow.",
        },
        {
          selector:
            "JSXAttribute[name.name='className'] JSXExpressionContainer TemplateLiteral TemplateElement[value.raw=/\\b(?:rounded|shadow|border|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap)-\\[[^\"]+\\]/]",
          message:
            "Prefer shared style tokens (see docs/style-tokens.md) over arbitrary Tailwind values for spacing/radius/border/shadow.",
        },
      ],
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
