/** Fail-closed lint boundary for versioned presentation source. */
export const presentationBoundary = {
  meta: { type: "problem", schema: [], messages: { forbidden: "Presentation TSX must be a declarative layout around the unchanged UiNode subtree and mapped callback; use the presentation compiler." } },
  create(context) {
    if (!context.filename.replaceAll("\\", "/").includes("/src/ehr/ui/custom/")) return {};
    const report = (node) => context.report({ node, messageId: "forbidden" });
    const wrappers = new Set(["Box", "Stack", "Group", "Paper", "Flex", "UiNodeView"]);
    return {
      "Program:exit"(node) {
        for (const statement of node.body) {
          if (statement.type === "ImportDeclaration") continue;
          if (statement.type !== "ExportDefaultDeclaration" || statement.declaration.type !== "FunctionDeclaration") report(statement);
        }
        for (const reference of context.sourceCode.scopeManager.globalScope.through) report(reference.identifier);
      },
      ImportDeclaration(node) {
        if (!["@mantine/core", "@ehr/presentation"].includes(node.source.value)) report(node);
        for (const item of node.specifiers) if (item.type !== "ImportSpecifier" || item.imported.name !== item.local.name || ![...wrappers, "PresentationProps"].includes(item.local.name)) report(item);
      },
      FunctionDeclaration(node) {
        if (node.parent.type !== "ExportDefaultDeclaration" || node.async || node.generator || node.params.length !== 1 || node.params[0].type !== "ObjectPattern" || node.body.body.length !== 1 || node.body.body[0].type !== "ReturnStatement") report(node);
      },
      CallExpression: report, NewExpression: report, AwaitExpression: report, ImportExpression: report, MemberExpression: report,
      JSXSpreadAttribute: report,
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier" || !wrappers.has(node.name.name)) report(node);
      },
      JSXAttribute(node) {
        if (["node", "onEvent"].includes(node.name.name)) {
          if (node.parent.name.name !== "UiNodeView" || node.value?.type !== "JSXExpressionContainer" || node.value.expression.type !== "Identifier" || node.value.expression.name !== node.name.name) report(node);
        } else if (node.name.name.startsWith("on") || ["style", "component", "dangerouslySetInnerHTML", "ref"].includes(node.name.name)) report(node);
      },
      JSXExpressionContainer(node) {
        if (!(node.expression.type === "Identifier" && ["node", "onEvent"].includes(node.expression.name)) && !(node.expression.type === "Literal" && typeof node.expression.value === "number")) report(node);
      },
    };
  },
};
