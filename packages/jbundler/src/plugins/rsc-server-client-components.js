import * as path from "node:path";

import * as babel from "@babel/core";
import * as esbuild from "esbuild";

/**
 * @param {import("../config.js").JBundlerConfig} config
 * @param {Set<string>} rscEntriesCache
 * @returns {import("../plugin.js").TransformPlugin}
 */
export function createServerClientComponentsTransformPlugin(
  config,
  rscEntriesCache
) {
  return async (contents) => {
    let code = contents.code;
    let loader = contents.loader;

    // check if code starts with "use client" or 'use client' ignoring whitespace
    if (!code.match(/^\s*['"]use client['"]/)) {
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
                // nodePath.replaceWith(node.declaration);
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
      footer += `Object.defineProperties(${rscExport}, {
        $$typeof: { value: Symbol.for("react.client.reference") },
        filepath: { value: ${JSON.stringify(
          path.relative(config.cwd, contents.path)
        )} },
        name: { value: ${JSON.stringify(rscExport)} },
      });
      `;
      // footer += `const ___RSC___${rscExport} = {
      //   $$typeof: Symbol.for('react.client.reference'),
      //   filepath: ${JSON.stringify(path.relative(config.cwd, contents.path))},
      //   name: ${JSON.stringify(rscExport)},
      // };\n`;
      // footer += `export { ___RSC___${rscExport} as ${rscExport} };\n`;
    }

    code = transformResult.code + footer;

    return {
      code,
      loader,
      path: contents.path,
    };
  };
}
