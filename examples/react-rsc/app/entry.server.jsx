/// <reference types="react/experimental" />
import { PassThrough, Transform } from "node:stream";

import { use } from "react";
import { renderToPipeableStream as renderToPipeableStreamDOM } from "react-dom/server";
import { createFromNodeStream } from "react-server-dom-webpack/client";
import { renderToPipeableStream as renderToPipeableStreamRSC } from "react-server-dom-webpack/server";
import { matchTrie } from "router-trie";

import entryScript, {
  imports as entryScriptImports,
} from "jbundler/client-entry";
import webpackMapJson from "jbundler/webpack-map";

import { MatchRenderer } from "./components/router.jsx";
import routes from "./routes.jsx";

const js = String.raw;
const RENDER_TIMEOUT = 5_000;
const webpackMap = JSON.parse(webpackMapJson);

/**
 * @param {{
 *  res: import("node:http").ServerResponse<import("node:http").IncomingMessage>;
 *  url: URL;
 * }} args
 */
export default async function handler({ res, url }) {
  const matches = matchTrie(routes, url.pathname);

  if (!matches) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  const matchPreparationPromises = [];
  for (const match of matches) {
    matchPreparationPromises.push(prepareMatch(match, url));
  }
  await Promise.all(matchPreparationPromises);

  const rscStream = renderToPipeableStreamRSC(
    <MatchRenderer matches={matches} />,
    webpackMap,
    {
      onError(error) {
        console.error(error);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Internal server error");
        }
      },
    }
  );

  if (url.searchParams.has("_rsc")) {
    rscStream.pipe(res);
    setTimeout(() => {
      rscStream.abort();
    }, RENDER_TIMEOUT);
  } else {
    const rscPassthrough = new PassThrough({ emitClose: true });
    const rscTransform = new RSCTransform(rscPassthrough);
    const rscChunk = createFromNodeStream(rscPassthrough, webpackMap);
    rscStream.pipe(rscPassthrough);
    function ReactServerComponent() {
      return use(rscChunk);
    }

    const domStream = renderToPipeableStreamDOM(<ReactServerComponent />, {
      bootstrapModules: [entryScript, ...entryScriptImports],
      onShellReady() {
        res.writeHead(200, { "Content-Type": "text/html" });
        domStream.pipe(rscTransform);
        rscTransform.pipe(res, { end: true });
      },
      onShellError(error) {
        console.error(error);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Internal server error");
        }
      },
      onError(error) {
        console.error(error);
      },
    });
    setTimeout(() => {
      rscStream.abort();
      domStream.abort();
    }, RENDER_TIMEOUT);
  }

  // if (!url.searchParams.has("_rsc")) {
  //   const html = renderToString(<Html />);
  //   res.writeHead(200, { "Content-Type": "text/html" });
  //   res.end("<!DOCTYPE html>" + html);
  //   return;
  // }
}

async function prepareMatch(match, url) {
  if (match.loader) {
    try {
      match.data = await match.loader({ url });
    } catch (error) {
      match.error = error || null;
    }
  }
}

class RSCTransform extends Transform {
  /**
   *
   * @param {import("node:stream").PassThrough} rscPassthrough
   */
  constructor(rscPassthrough) {
    super();
    this.rscPassthrough = rscPassthrough;
    this.readyToFlush = false;
    this.bufferedChunks = [];
    this.rscPromise = new Promise((resolve, reject) => {
      this.rscPassthrough.on("data", (chunk) => {
        const chunkString = chunk.toString();
        const toPush = `<script>
  window._rsc.controller.enqueue(
    window._rsc.encoder.encode(
      ${JSON.stringify(chunkString)}
    )
  );
</script>`;

        if (this.readyToFlush) {
          this.push(toPush);
        } else {
          this.bufferedChunks.push(toPush);
        }
      });
      this.rscPassthrough.on("end", () => {
        resolve();
      });
      this.rscPassthrough.on("error", (error) => {
        reject(error);
      });
    });
  }

  _transform(chunk, encoding, callback) {
    callback(null, chunk);
  }

  _final(callback) {
    this.rscPromise.then(
      () => {
        for (const chunk of this.bufferedChunks) {
          this.push(chunk);
        }
        this.push(`<script>window._rsc.controller.close();</script>`);
        callback();
      },
      (err) => {
        callback(err);
      }
    );
  }
}
