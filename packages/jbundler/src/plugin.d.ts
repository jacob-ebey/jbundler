import type * as esbuild from "esbuild";

export interface TransformContents {
  code: string;
  loader: esbuild.Loader;
  path: string;
}

export type TransformPlugin = (
  contents: TransformContents
) => TransformContents | Promise<TransformContents>;

export type PostProcessPlugin = (
  output: esbuild.OutputFile
) => esbuild.OutputFile;

export function createESBuildPlugin(args: {
  transformPlugins?: TransformPlugin[];
}): esbuild.Plugin;
