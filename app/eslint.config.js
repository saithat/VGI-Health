import { presentationBoundary } from "./scripts/presentation-lint.mjs";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Deliberately apply the boundary to tests and future files too.
const boundary = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      network:
        "Network access belongs in src/data/commitService.ts; dashboard/data.ts and browser/data.ts may fetch constrained local JSON.",
    },
  },
  create(context) {
    return {
      Identifier(node) {
        if (
          node.name === "fetch" &&
          ![
            "/src/dashboard/data.ts",
            "/src/browser/data.ts",
            "/src/data/commitService.ts",
          ].some((path) =>
            context.filename.replaceAll("\\", "/").endsWith(path),
          )
        )
          context.report({ node, messageId: "network" });
      },
      MemberExpression(node) {
        if (
          node.computed &&
          node.property.type === "Literal" &&
          node.property.value === "fetch"
        )
          context.report({ node, messageId: "network" });
      },
    };
  },
};

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "public/ehr/**"] },
  js.configs.recommended,
  {
    files: ["scripts/*.mjs"],
    languageOptions: { globals: { process: "readonly" } },
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,mjs}"],
    plugins: {
      boundary: {
        rules: {
          "single-data-module": boundary,
          presentation: presentationBoundary,
        },
      },
    },
    rules: {
      "boundary/single-data-module": "error",
      "boundary/presentation": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-nocheck": true, "ts-expect-error": true },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'TSAsExpression:not([typeAnnotation.type="TSTypeReference"][typeAnnotation.typeName.name="const"])',
          message: "Use validation or narrowing; only as const is allowed.",
        },
        {
          selector: "TSTypeAssertion",
          message: "Type assertions are forbidden.",
        },
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message: "Render text and React elements only.",
        },
        {
          selector: 'Property[key.name="dangerouslySetInnerHTML"]',
          message: "Raw HTML is forbidden.",
        },
        {
          selector: 'Property[key.value="dangerouslySetInnerHTML"]',
          message: "Raw HTML is forbidden.",
        },
      ],
    },
  },
);
