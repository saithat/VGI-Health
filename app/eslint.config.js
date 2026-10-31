import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Deliberately apply the boundary to tests and future files too.
const boundary = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      network:
        "Only src/data/medplum.ts may use fetch or import @medplum/core.",
    },
  },
  create(context) {
    if (context.filename.replaceAll("\\", "/").endsWith("/src/data/medplum.ts"))
      return {};
    return {
      ImportDeclaration(node) {
        if (node.source.value === "@medplum/core")
          context.report({ node, messageId: "network" });
      },
      ImportExpression(node) {
        if (
          node.source.type === "Literal" &&
          node.source.value === "@medplum/core"
        )
          context.report({ node, messageId: "network" });
      },
      ExportNamedDeclaration(node) {
        if (node.source?.value === "@medplum/core")
          context.report({ node, messageId: "network" });
      },
      ExportAllDeclaration(node) {
        if (node.source.value === "@medplum/core")
          context.report({ node, messageId: "network" });
      },
      Identifier(node) {
        if (node.name === "fetch")
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
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "require" &&
          node.arguments.some(
            (arg) => arg.type === "Literal" && arg.value === "@medplum/core",
          )
        )
          context.report({ node, messageId: "network" });
      },
    };
  },
};

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  { files: ["scripts/*.mjs"], languageOptions: { globals: { process: "readonly" } } },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,mjs}"],
    plugins: { boundary: { rules: { "single-data-module": boundary } } },
    rules: {
      "boundary/single-data-module": "error",
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
