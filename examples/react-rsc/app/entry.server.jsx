/// <reference types="react/experimental" />
import * as path from "node:path";
import { PassThrough, Transform } from "node:stream";

import * as React from "react";
import { renderToPipeableStream as renderToPipeableStreamDOM } from "react-dom/server";
import { createFromNodeStream } from "react-server-dom-webpack/client";
import { renderToPipeableStream as renderToPipeableStreamRSC } from "react-server-dom-webpack/server";
import { matchTrie } from "router-trie";

import entryScript, {
  imports as entryScriptImports,
} from "jbundler/client-entry";
import { RscContext } from "jbundler/rsc-context";
import webpackMapJson from "jbundler/webpack-map";

import { createElementsFromMatches } from "./components/router.jsx";
import routes from "./routes.jsx";

const html = String.raw;
const RENDER_TIMEOUT = 5_000;
const webpackMap = JSON.parse(webpackMapJson);

/**
 * @param {{
 *  res: import("node:http").ServerResponse<import("node:http").IncomingMessage>;
 *  url: URL;
 * }} args
 */
export default async function handler({ res, url }) {
  /** @type {ReturnType<typeof renderToPipeableStreamRSC>} */
  let rscStream;
  if (
    url.searchParams.get("_rsc") &&
    url.searchParams.get("_name") &&
    url.searchParams.get("_props")
  ) {
    const rscId = url.searchParams.get("_rsc");
    const name = url.searchParams.get("_name");
    const props = JSON.parse(url.searchParams.get("_props"));
    const specifier = webpackMap[rscId][name].specifier;
    const mod = await import(path.resolve(process.cwd(), specifier));
    const Comp = mod[name];
    rscStream = renderToPipeableStreamRSC(<Comp {...props} />, webpackMap, {
      onError(error) {
        console.error(error);
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Internal server error");
        }
      },
    });
  } else {
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

    rscStream = renderToPipeableStreamRSC(
      createElementsFromMatches(matches),
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
  }

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
      return React.use(rscChunk);
    }

    const domStream = renderToPipeableStreamDOM(
      <RscContext.Provider value={rscTransform}>
        <ReactServerComponent />
      </RscContext.Provider>,
      {
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
      }
    );
    setTimeout(() => {
      rscStream.abort();
      domStream.abort();
    }, RENDER_TIMEOUT);
  }
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
    this.readyToFlushPromise = new Promise((resolve) => {
      this.resolveReadyToFlush = resolve;
    });
    this.childStreamPromises = [];
    this.rscPromise = new Promise((resolve, reject) => {
      let bufferedChunks = [];
      this.rscPassthrough.on("data", (chunk) => {
        const chunkString = chunk.toString();
        const toPush = html`<script>
          window._rsc.controller.enqueue(
            window._rsc.encoder.encode(${JSON.stringify(chunkString)})
          );
        </script>`;

        if (this.readyToFlush) {
          for (const bufferedChunk of bufferedChunks) {
            this.push(bufferedChunk);
          }
          bufferedChunks = [];
          this.push(toPush);
        } else {
          bufferedChunks.push(toPush);
        }
      });
      this.rscPassthrough.on("end", () => {
        resolve(bufferedChunks);
      });
      this.rscPassthrough.on("error", (error) => {
        reject(error);
      });
    }).then(async (bufferedChunks) => {
      await this.readyToFlushPromise;
      for (const chunk of bufferedChunks) {
        this.push(chunk);
      }
      this.push(
        html`<script>
          window._rsc.controller.close();
        </script>`
      );
    });
  }

  queueChildStream(id, childStream) {
    const idJSON = JSON.stringify(id);
    this.childStreamPromises.push(
      new Promise((resolve, reject) => {
        let bufferedChunks = [
          html`<script>
            window._rsc = window._rsc || { encoder: new TextEncoder() };
            window._rsc[${idJSON}] = {};
            window._rsc[${idJSON}].response = new Response(
              new ReadableStream({
                start(controller) {
                  window._rsc[${idJSON}].controller = controller;
                },
              }),
              { headers: { "Content-Type": "text/plain" } }
            );
          </script>`,
        ];
        childStream.on("data", (chunk) => {
          const chunkString = chunk.toString();
          const toPush = `<script>
            window._rsc[${idJSON}].controller.enqueue(
              window._rsc.encoder.encode(
                ${JSON.stringify(chunkString)}
              )
            );
          </script>`;

          if (this.readyToFlush) {
            for (const bufferedChunk of bufferedChunks) {
              this.push(bufferedChunk);
            }
            bufferedChunks = [];
            this.push(toPush);
          } else {
            bufferedChunks.push(toPush);
          }
        });
        childStream.on("end", () => {
          resolve(bufferedChunks);
        });
        childStream.on("error", (error) => {
          reject(error);
        });
      }).then(async (bufferedChunks) => {
        await this.readyToFlushPromise;
        for (const chunk of bufferedChunks) {
          this.push(chunk);
        }
        this.push(
          html`<script>
            window._rsc[${idJSON}].controller.close();
          </script>`
        );
      })
    );
  }

  _transform(chunk, encoding, callback) {
    callback(null, chunk);
    this.readyToFlush = chunk.toString().includes("</body>");
    if (this.readyToFlush && this.resolveReadyToFlush) {
      this.resolveReadyToFlush();
      this.resolveReadyToFlush = null;
    }
  }

  _final(callback) {
    Promise.all([this.rscPromise, ...this.childStreamPromises])
      .then(() => {
        callback();
      })
      .catch((error) => {
        callback(error);
      });
  }
}

function createChildStream(id, childStream) {}
