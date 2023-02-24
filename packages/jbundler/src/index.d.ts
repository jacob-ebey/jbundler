import type { JBundlerConfig } from "./config.js";

export * from "./config.js";
export function build(config: JBundlerConfig): Promise<void>;
export function watch(config: JBundlerConfig): Promise<void>;
