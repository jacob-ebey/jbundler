type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object
    ? RecursivePartial<T[P]>
    : T[P];
};

export type PartialJBundlerConfig = RecursivePartial<JBundlerConfig>;

export interface JBundlerConfig {
  cwd: string;
  rsc: boolean;
  browser: JBundlerBrowserConfig;
  server: JBundlerServerConfig;
}

export interface JBundlerBaseConfig {
  entry: string;
  outdir: string;
  stripExports: Record<string, string[]>;
}

export interface JBundlerBrowserConfig extends JBundlerBaseConfig {
  publicPath: string;
}

export interface JBundlerServerConfig extends JBundlerBaseConfig {}

export function loadConfig(cwd: string): JBundlerConfig;
