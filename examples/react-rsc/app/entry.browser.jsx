/// <reference types="react/experimental" />
import { startTransition, use, useLayoutEffect } from "react";
import { hydrateRoot } from "react-dom/client";
import { createFromFetch } from "react-server-dom-webpack/client";

/** @type {Promise<Response>} */
let rscResponse;
if (window._rsc) {
  rscResponse = Promise.resolve(window._rsc.response);
} else {
  const url = new URL(location.href);
  url.searchParams.set("_rsc", "");
  rscResponse = fetch(url);
}

let rscChunk = createFromFetch(rscResponse);
/**
 *
 * @param {{
 *  done?: () => void;
 * }} param0
 * @returns
 */
function ReactServerComponent({ done }) {
  useLayoutEffect(() => {
    if (done) done();
  }, [done]);
  return use(rscChunk);
}

const root = hydrateRoot(document, <ReactServerComponent />);

/** @type {AbortController | undefined} */
let lastAbortController;
const updateDOM = async (url, signal) => {
  const rscUrl = new URL(url);
  rscUrl.searchParams.set("_rsc", "");
  const rscResponse = fetch(rscUrl);
  rscChunk = createFromFetch(rscResponse);

  if (!signal.aborted) {
    return new Promise((resolve, reject) => {
      signal.addEventListener(
        "abort",
        (error) => {
          reject(error);
        },
        { once: true }
      );
      let called = false;
      startTransition(() => {
        root.render(
          <ReactServerComponent
            done={() => {
              resolve();
              if (called) return;
              called = true;
              if (!window.navigation && !signal.aborted) {
                window.history.pushState(null, "", url.href);
              }
            }}
          />
        );
      });
    });
  }
};

/**
 * @param {NavigateEvent} event
 */
const handleNavigate = (event) => {
  if (!event.canIntercept || event.hashChange || event.downloadRequest) {
    return;
  }

  const url = new URL(event.destination.url);
  if (url.origin !== location.origin) {
    return;
  }

  if (lastAbortController) {
    lastAbortController.abort();
  }
  lastAbortController = new AbortController();
  const signal = lastAbortController.signal;

  event.intercept({
    async handler() {
      if (!document.startViewTransition) {
        await updateDOM(url, signal);
      } else {
        const transition = document.startViewTransition(async () => {
          await updateDOM(url, signal);
        });
        signal.addEventListener(
          "abort",
          () => {
            transition.skipTransition();
          },
          { once: true }
        );
        await transition.domUpdated;
      }
    },
  });
};

if (window.navigation) {
  window.navigation.addEventListener("navigate", handleNavigate);
}
