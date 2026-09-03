import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig, globalIgnores } from "eslint/config";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    settings: {
      "import/resolver": {
        typescript: true,
        node: true,
      },
    },
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./lib",
              from: "./components",
              message: "lib/ must not import from components/ (AGENTS.md §2.1)",
            },
            {
              target: "./lib",
              from: "./app",
              message: "lib/ must not import from app/ (AGENTS.md §2.1)",
            },
            {
              target: "./lib",
              from: "./content",
              message: "lib/ must not import from content/ (AGENTS.md §2.1)",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message:
            "Direct process.env access is forbidden outside lib/env.ts — import { env } from '@/lib/env' instead (AGENTS.md §2.2)",
        },
      ],
    },
  },
  {
    files: ["lib/env.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  {
    files: [
      "next.config.ts",
      "postcss.config.mjs",
      "vitest.config.*",
      "prisma/seed.ts",
    ],
    rules: {
      "no-restricted-syntax": "off",
      "import/no-restricted-paths": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),
]);

export default eslintConfig;
