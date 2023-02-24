import * as fs from "node:fs";
import * as path from "node:path";

/** @type {import("./plugin.js").createESBuildPlugin} */
export function createESBuildPlugin({ transformPlugins }) {
  return {
    name: "jbundler",
    setup(build) {
      build.onLoad({ filter: /.*/ }, async (args) => {
        let code = undefined;
        const input = Object.defineProperties(
          /** @type {import("./plugin.js").TransformContents} */ ({}),
          {
            code: {
              get() {
                if (code === undefined) {
                  code = fs.readFileSync(args.path, "utf8");
                }
                return code;
              },
            },
            loader: {
              value: /** @type {import("esbuild").Loader} */ (
                path.extname(args.path).slice(1)
              ),
            },
            path: { value: args.path },
          }
        );
        let contents = input;
        for (const plugin of transformPlugins || []) {
          contents = await plugin(contents);
          if (contents.path !== args.path) {
            throw new Error(
              `Plugin ${plugin.name} changed the path from ${path} to ${contents.path}`
            );
          }
        }

        if (contents === input) {
          return;
        }

        return {
          contents: contents.code,
          loader: contents.loader,
          resolveDir: path.dirname(args.path),
        };
      });
    },
  };
}
