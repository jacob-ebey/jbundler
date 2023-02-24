import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import arg from "arg";

import { loadConfig } from "./config.js";
import * as jbundler from "./index.js";

const argv = process.argv.slice(2);
const {
  "--cwd": cliCWD,
  "--help": help,
  "--version": version,
  _: [command, ...rest],
} = arg(
  {
    "--cwd": String,
    "--help": Boolean,
    "--version": Boolean,
  },
  {
    argv,
  }
);

const cwd = cliCWD ? path.resolve(process.cwd(), cliCWD) : process.cwd();

let exitCode = 0;

try {
  if (version) {
    const packageJSON = fs.readFileSync(
      url.fileURLToPath(new URL("../package.json", import.meta.url)),
      "utf8"
    );
    const { version } = JSON.parse(packageJSON);
    console.log(`jbundler v${version}`);
  } else {
    switch (command) {
      case "build": {
        if (help) {
          printBuildHelp();
          break;
        }
        const config = loadConfig(cwd);
        await jbundler.build(config);
        break;
      }
      case "dev": {
        if (help) {
          printDevHelp();
          break;
        }
        const config = loadConfig(cwd);
        await jbundler.watch(config);
        break;
      }
      case "help": {
        printHelp();
        break;
      }
      default: {
        if (command) console.error(`Unknown command: ${command}`);
        else printHelp();

        break;
      }
    }
  }
} catch (error) {
  if (process.env.VERBOSE) {
    console.error(error);
  } else {
    console.error(error.message);
  }
  exitCode = 1;
}

process.exit(exitCode);

function printHelp() {
  console.log(`Usage: jbundler command [options]

Commands:
  build    Build the project
  dev      Start the development server
  help     Print this help message

Options:
  --cwd    The directory to run the command in
  --help   Print the help message for a command
  --version  Print the version of jbundler
`);
}

function printBuildHelp() {
  console.log(`Usage: jbundler build [options]

Options:
  --cwd    The directory to run the command in
  --help   Print the help message for a command
`);
}

function printDevHelp() {
  console.log(`Usage: jbundler dev [options] -- [devCommand]

Options:
  --cwd    The directory to run the command in
  --help   Print the help message for a command

Arguments:
  devCommand  A command to run in parallel with the development server
`);
}
