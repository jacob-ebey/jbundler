import * as babel from "@babel/core";
import * as esbuild from "esbuild";
import globToRegExp from "glob-to-regexp";

/**
 * @param {Record<string, string[]>} stripExports
 * @returns {import("../plugin.js").TransformPlugin}
 */
export function createStripExportsTransformPlugin(stripExports) {
  const regexpToStrip = Object.entries(stripExports).map(
    ([glob, toStrip]) =>
      /** @type {[RegExp, Set<string>]} */ ([
        globToRegExp(glob, { extended: true }),
        new Set(toStrip),
      ])
  );

  return async (contents) => {
    /** @type {string[]} */
    const strippedExports = [];
    /** @type {Set<string> | undefined} */
    let exportsToStrip;
    for (const [regex, toStrip] of regexpToStrip) {
      if (regex.test(contents.path)) {
        exportsToStrip = toStrip;
        break;
      }
    }

    if (!exportsToStrip || exportsToStrip.size === 0) {
      return contents;
    }

    let code = contents.code;
    let loader = contents.loader;

    if (loader !== "js") {
      const transformResult = await esbuild.transform(code, {
        loader: "tsx",
        jsx: "automatic",
      });
      code = transformResult.code;
      loader = "js";
    }

    const t = babel.types;
    const transformResult = babel.transformSync(code, {
      babelrc: false,
      configFile: false,
      filename: contents.path,
      plugins: [
        {
          visitor: {
            ExportNamedDeclaration(nodePath) {
              let { node } = nodePath;
              if (node.source) {
                let specifiers = node.specifiers.filter(({ exported }) => {
                  let name = t.isIdentifier(exported)
                    ? exported.name
                    : exported.value;
                  let hasName = exportsToStrip.has(name);
                  if (hasName) strippedExports.push(name);
                  return !hasName;
                });
                if (specifiers.length === node.specifiers.length) return;
                if (specifiers.length === 0) return nodePath.remove();
                nodePath.replaceWith(
                  t.exportNamedDeclaration(
                    node.declaration,
                    specifiers,
                    node.source
                  )
                );
              }
              if (t.isFunctionDeclaration(node.declaration)) {
                let name = node.declaration.id?.name;
                if (!name) return;
                if (exportsToStrip.has(name)) {
                  strippedExports.push(name);
                  return nodePath.remove();
                }
              }
              if (t.isVariableDeclaration(node.declaration)) {
                let declarations = node.declaration.declarations.filter((d) => {
                  let name = t.isIdentifier(d.id) ? d.id.name : undefined;
                  if (!name) return false;
                  let hasName = exportsToStrip.has(name);
                  if (hasName) strippedExports.push(name);
                  return !hasName;
                });
                if (declarations.length === 0) return nodePath.remove();
                if (
                  declarations.length === node.declaration.declarations.length
                )
                  return;
                nodePath.replaceWith(
                  t.variableDeclaration(node.declaration.kind, declarations)
                );
              }
            },
          },
        },
      ],
    });

    if (typeof transformResult.code !== "string") {
      throw new Error("No code was returned from babel transform");
    }

    let footer = "";
    let defaultExport = false;
    for (let name of strippedExports) {
      if (name === "default") {
        defaultExport = true;
        continue;
      }
      footer += `export const ${name} = true;`;
    }
    if (defaultExport) {
      footer += `export default true;`;
    }

    code = transformResult.code + footer;

    return {
      code,
      loader,
      path: contents.path,
    };
  };
}
