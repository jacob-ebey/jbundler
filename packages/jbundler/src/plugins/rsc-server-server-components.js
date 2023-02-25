import * as path from "node:path";

import * as babel from "@babel/core";
import * as esbuild from "esbuild";

/**
 * @param {import("../config.js").JBundlerConfig} config
 * @param {Set<string>} rscEntriesCache
 * @returns {import("../plugin.js").TransformPlugin}
 */
export function createServerServerComponentsTransformPlugin(
  config,
  rscEntriesCache
) {
  return async (contents) => {
    let code = contents.code;
    let loader = contents.loader;

    if (!code.match(/^\s*['"]use server['"]/)) {
      return contents;
    }

    rscEntriesCache.add(contents.path);

    if (loader !== "js") {
      const transformResult = await esbuild.transform(code, {
        loader: "tsx",
        jsx: "automatic",
      });
      code = transformResult.code;
      loader = "js";
    }

    const rscExports = [];
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
              if (t.isFunctionDeclaration(node.declaration)) {
                let name = node.declaration.id?.name;
                if (!name || name[0] !== name[0].toUpperCase()) return;
                rscExports.push(name);
              }
            },
            ExportDefaultDeclaration(nodePath) {
              let { node } = nodePath;
              if (t.isFunctionDeclaration(node.declaration)) {
                let name = node.declaration.id?.name;
                if (!name || name[0] !== name[0].toUpperCase()) return;
                rscExports.push([name, "default"]);
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
    for (const rscExport of rscExports) {
      let [defineFor, name] = Array.isArray(rscExport)
        ? rscExport
        : [rscExport, rscExport];
      footer += `Object.defineProperties(${defineFor}, {
        $$typeof: { value: Symbol.for('react.server.reference') },
        filepath: { value: ${JSON.stringify(
          path.relative(config.cwd, contents.path)
        )} },
        name: { value: ${JSON.stringify(name)} },
        async: { value: true },
      });
      `;
    }

    code = transformResult.code + footer;

    return {
      code,
      loader,
      path: contents.path,
    };
  };
}
