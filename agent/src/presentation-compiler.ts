/** Compile a deliberately declarative TSX subset, never evaluate agent JavaScript. */
import ts from 'typescript';
import { presentationBundleSchema, wrapperNames, wrapperPropsSchema, type Layout, type PresentationBundle } from '../../app/src/ehr/ui/presentation-types.js';
import { compositeUses } from './composites.js';
import type { Program } from './schema.js';
const wrappers = new Set<string>(wrapperNames);
function fail(message: string): never { throw new Error(`Presentation sandbox: ${message}`); }
export function compilePresentations(program: Program): PresentationBundle | null {
  const sources = program.presentationComponents ?? [];
  if (!sources.length) return null;
  if (new Set(sources.map((s) => s.key)).size !== sources.length || new Set(sources.map((s) => s.name)).size !== sources.length) fail('duplicate key or name');
  const components = sources.map((source) => {
    if (/@(?:jsx|ts-)|sourceMappingURL/.test(source.source)) fail('compiler directives are forbidden');
    const file = ts.createSourceFile(`${source.name}.tsx`, source.source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
    const syntax = ts.transpileModule(source.source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
    if (syntax.diagnostics?.some((d) => d.category === ts.DiagnosticCategory.Error)) fail('invalid TSX');
    const imported = new Set<string>();
    let declaration: ts.FunctionDeclaration | undefined;
    for (const statement of file.statements) {
      if (ts.isImportDeclaration(statement)) {
        if (!ts.isStringLiteral(statement.moduleSpecifier)) fail('invalid import');
        const module = statement.moduleSpecifier.text;
        const bindings = statement.importClause?.namedBindings;
        if (!bindings || !ts.isNamedImports(bindings) || statement.importClause?.name) fail('named allowlisted imports only');
        for (const item of bindings.elements) {
          if (item.propertyName) fail('import aliases are forbidden');
          const name = item.name.text;
          const typeOnly = item.isTypeOnly || statement.importClause?.isTypeOnly;
          if (name === 'PresentationProps' ? !typeOnly : typeOnly) fail('use type-only PresentationProps and value imports for components');
          if (!(module === '@mantine/core' && wrappers.has(name)) && !(module === '@ehr/presentation' && ['UiNodeView', 'PresentationProps'].includes(name))) fail(`import ${module}/${name} is not allowlisted`);
          if (imported.has(name)) fail('duplicate import');
          imported.add(name);
        }
      } else if (ts.isFunctionDeclaration(statement) && !declaration) declaration = statement;
      else fail('only imports and one exported presentation function are allowed');
    }
    const fn = declaration;
    if (!fn || fn.name?.text !== source.name || !fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) || !fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) || fn.modifiers.some((m) => ![ts.SyntaxKind.DefaultKeyword, ts.SyntaxKind.ExportKeyword].includes(m.kind)) || fn.asteriskToken || fn.type || fn.typeParameters || fn.parameters.length !== 1 || !fn.body) fail('expected one default exported pure component');
    const parameter = fn.parameters[0];
    if (!parameter || parameter.initializer || parameter.dotDotDotToken || parameter.questionToken || !ts.isObjectBindingPattern(parameter.name) || !parameter.type || !ts.isTypeReferenceNode(parameter.type) || parameter.type.typeName.getText(file) !== 'PresentationProps' || parameter.type.typeArguments || !imported.has('PresentationProps')) fail('props must be { node, onEvent }: PresentationProps');
    const names = parameter.name.elements.map((e) => {
      if (!ts.isIdentifier(e.name) || e.propertyName || e.initializer || e.dotDotDotToken) fail('no computed/default/rest props');
      return e.name.text;
    }).sort();
    if (names.join(',') !== 'node,onEvent') fail('only the supplied subtree and mapped callback are available');
    const returned = fn.body.statements[0];
    if (fn.body.statements.length !== 1 || !returned || !ts.isReturnStatement(returned) || !returned.expression) fail('component body must be one JSX return');
    let leaves = 0;
    const used = new Set<string>(['PresentationProps']);
    const lower = (expression: ts.Expression): Layout => {
      if (ts.isParenthesizedExpression(expression)) return lower(expression.expression);
      if (!ts.isJsxElement(expression) && !ts.isJsxSelfClosingElement(expression)) fail('JS expressions, hooks, globals and side effects are forbidden');
      const opening = ts.isJsxElement(expression) ? expression.openingElement : expression;
      if (!ts.isIdentifier(opening.tagName)) fail('only imported layout components are allowed');
      const name = opening.tagName.text;
      if (!imported.has(name)) fail(`unimported component ${name}`);
      used.add(name);
      const props: Record<string, string | number | boolean> = {};
      const attrs = opening.attributes.properties;
      if (name === 'UiNodeView') {
        if (attrs.length !== 2 || !ts.isJsxSelfClosingElement(expression)) fail('UiNodeView must forward exactly node and onEvent');
        const seen = new Set<string>();
        for (const attr of attrs) {
          if (!ts.isJsxAttribute(attr) || !ts.isIdentifier(attr.name) || !['node', 'onEvent'].includes(attr.name.text) || seen.has(attr.name.text) || !attr.initializer || !ts.isJsxExpression(attr.initializer) || !attr.initializer.expression || !ts.isIdentifier(attr.initializer.expression) || attr.initializer.expression.text !== attr.name.text) fail('callback/subtree must pass through unchanged');
          seen.add(attr.name.text);
        }
        leaves++;
        return { leaf: true };
      }
      if (!wrappers.has(name) || !ts.isJsxElement(expression)) fail('layout wrapper required');
      for (const attr of attrs) {
        if (!ts.isJsxAttribute(attr) || !ts.isIdentifier(attr.name) || Object.hasOwn(props, attr.name.text)) fail('no spreads, computed or duplicate props');
        if (['__proto__', 'constructor', 'prototype'].includes(attr.name.text)) fail('prototype props are forbidden');
        const initializer = attr.initializer;
        if (!initializer) props[attr.name.text] = true;
        else if (ts.isStringLiteral(initializer)) props[attr.name.text] = initializer.text;
        else if (ts.isJsxExpression(initializer) && initializer.expression && ts.isNumericLiteral(initializer.expression)) props[attr.name.text] = Number(initializer.expression.text);
        else fail('only literal layout props are allowed');
      }
      const children = expression.children.filter((c) => !ts.isJsxText(c) || c.text.trim());
      const child = children[0];
      if (children.length !== 1 || !child || (!ts.isJsxElement(child) && !ts.isJsxSelfClosingElement(child))) fail('exactly one complete subtree must survive every wrapper');
      return { wrapper: wrapperNames.find((w) => w === name) ?? fail('unknown wrapper'), props: wrapperPropsSchema.parse(props), child: lower(child) };
    };
    const layout = lower(returned.expression);
    if (leaves !== 1 || [...imported].some((name) => !used.has(name))) fail('one unchanged subtree and no unused imports required');
    return { ...source, layout };
  });
  return presentationBundleSchema.parse({ schemaVersion: 1, owner: program.owner, version: program.version, components, composites: compositeUses(program) });
}
