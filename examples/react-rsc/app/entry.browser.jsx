/// <reference types="react/experimental" />
import { use } from "react";
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

const rscChunk = createFromFetch(rscResponse);
function ReactServerComponent() {
  return use(rscChunk);
}

hydrateRoot(document.getElementById("app"), <ReactServerComponent />);
