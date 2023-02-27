/// <reference types="react/experimental" />
import * as React from "react";
import * as ReactRSC from "react-server-dom-webpack/client";

export function createServerComponent(filepath, name, displayName) {
  /**
   * @type {React.FC<any>}
   */
  const Component = ({ children, ...props }) => {
    const p = JSON.stringify(props);
    const cacheId = filepath + ":" + name + ":" + p;

    if (
      window._rsc[cacheId] &&
      window._rsc[cacheId].response &&
      (!window._rsc.chunks || !window._rsc.chunks[cacheId])
    ) {
      const rscChunk = ReactRSC.createFromFetch(
        Promise.resolve(window._rsc[cacheId].response)
      );
      window._rsc.chunks = window._rsc.chunks || {};
      window._rsc.chunks[cacheId] = rscChunk;
    }

    let rscChunk = (window._rsc.chunks = window._rsc.chunks || {})
      ? window._rsc.chunks[cacheId]
      : undefined;
    if (!rscChunk) {
      const rscUrl = new URL(location.href);
      rscUrl.searchParams.set("_rsc", filepath);
      rscUrl.searchParams.set("_name", name);
      rscUrl.searchParams.set("_props", p);
      const rscResponse = fetch(rscUrl);
      rscChunk = ReactRSC.createFromFetch(rscResponse);
      window._rsc.chunks[cacheId] = rscChunk;
    }
    return React.use(rscChunk);
  };
  Component.displayName = displayName;

  return Component;
}
