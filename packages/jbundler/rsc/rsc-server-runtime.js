/// <reference types="react/experimental" />
import { PassThrough } from "node:stream";

import * as React from "react";
import { createFromNodeStream } from "react-server-dom-webpack/client";
import { renderToPipeableStream as renderToPipeableStreamRSC } from "react-server-dom-webpack/server";

import { RscContext } from "jbundler/rsc-context";
import webpackMapJson from "jbundler/webpack-map";
const webpackMap = JSON.parse(webpackMapJson);

export function createServerComponent(Component, filepath, name, displayName) {
  /**
   * @type {React.FC<any>}
   */
  const RSCComponent = (props) => {
    const p = JSON.stringify(props);
    const cacheId = filepath + ":" + name + ":" + p;

    const rscContext = React.useContext(RscContext);
    const rscStream = renderToPipeableStreamRSC(
      React.createElement(Component, props),
      webpackMap
    );
    const rscPassthrough = new PassThrough({ emitClose: true });
    if (rscContext) {
      rscContext.queueChildStream(cacheId, rscPassthrough);
    }

    const rscChunk = createFromNodeStream(rscPassthrough, webpackMap);
    rscStream.pipe(rscPassthrough);
    function ReactServerComponent() {
      return React.use(rscChunk);
    }

    return React.createElement(ReactServerComponent);
  };
  RSCComponent.displayName = "RSC (" + displayName + ")";
  Object.defineProperties(RSCComponent, {
    $$typeof: { value: Symbol.for("react.server.component") },
  });

  return RSCComponent;
}
