// @ts-expect-error
import { use } from "react";
import { createRoot } from "react-dom/client";
import { createFromFetch } from "react-server-dom-webpack/client";

const moduleCache = {};
globalThis.__webpack_chunk_load__ = async (chunkId) => {
  moduleCache[chunkId] = await import(chunkId);
};

globalThis.__webpack_require__ = (chunkId) => {
  return moduleCache[chunkId];
};

const url = new URL(location.href);
url.searchParams.set("_rsc", "");
const rscChunk = createFromFetch(fetch(url));

function ReactServerComponent() {
  return use(rscChunk);
}

createRoot(document.getElementById("app")).render(<ReactServerComponent />);
