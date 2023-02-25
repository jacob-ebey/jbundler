/// <reference types="react/experimental" />
import { use } from "react";
import { createRoot } from "react-dom/client";
import { createFromFetch } from "react-server-dom-webpack/client";

/** @type {Promise<Response>} */
let rscResponse;

const rscNode = document.querySelector("script[type='text/rsc']");
if (rscNode) {
  rscResponse = fetch(`data:text/plain;base64,${btoa(rscNode.textContent)}`);
} else {
  const url = new URL(location.href);
  url.searchParams.set("_rsc", "");
  rscResponse = fetch(url);
}

const rscChunk = createFromFetch(rscResponse);
function ReactServerComponent() {
  return use(rscChunk);
}

createRoot(document.getElementById("app")).render(<ReactServerComponent />);
