import * as fs from "node:fs";
import * as path from "node:path";

/** @type {import("./config.js").loadConfig} */
export function loadConfig(cwd) {
  const config = tryReadPackageJSON(cwd);
  return applyConfigDefaults(config, cwd);
}

function tryReadPackageJSON(cwd) {
  try {
    const { jbundler } = JSON.parse(
      fs.readFileSync(path.resolve(cwd, "package.json"), "utf8")
    );
    return jbundler || null;
  } catch (error) {
    return null;
  }
}

const ENTRY_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];
/**
 *
 * @param {Partial<import("./config.js").PartialJBundlerConfig>} config
 * @param {string} cwd
 */
function applyConfigDefaults(config, cwd) {
  config = config || {};
  config.cwd = cwd;
  config.rsc = config.rsc || false;

  const appDir = path.join(cwd, "app");

  config.browser = config.browser || {};
  config.browser.entry =
    config.browser.entry ||
    findSourceFile(appDir, "entry.browser", ENTRY_EXTENSIONS);
  config.browser.outdir =
    config.browser.outdir || path.join(cwd, "public/build");
  config.browser.publicPath = config.browser.publicPath || "/build/";
  config.browser.stripExports = config.browser.stripExports || {};

  config.server = config.server || {};
  config.server.entry =
    config.server.entry ||
    findSourceFile(appDir, "entry.server", ENTRY_EXTENSIONS);
  config.server.outdir = config.server.outdir || path.join(cwd, "build");
  config.server.stripExports = config.server.stripExports || {};

  return /** @type {import("./config.js").JBundlerConfig} */ (config);
}

/**
 * @param {string} lookupDir
 * @param {string} basename
 * @param {string[]} extensions
 */
function findSourceFile(lookupDir, basename, extensions) {
  let checked = [];
  for (const ext of extensions) {
    const filename = basename + ext;
    checked.push(filename);
    const filepath = path.resolve(lookupDir, filename);
    if (fs.existsSync(filepath)) {
      return filepath;
    }
  }

  throw new Error(
    `Could not find ${basename} in ${lookupDir} (checked ${checked.join(", ")})`
  );
}
