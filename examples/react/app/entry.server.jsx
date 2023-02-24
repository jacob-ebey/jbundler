import { renderToPipeableStream } from "react-dom/server";
import { matchTrie } from "router-trie";

import { MatchRenderer } from "./components/router.jsx";
import routes from "./routes.jsx";
import { formatError } from "./util.js";

const RENDER_TIMEOUT = 5_000;

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

  const routeId = url.searchParams.get("_data");
  if (routeId) {
    const match = matches.find((match) => match.id === routeId);
    if (!match?.loader) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }

    try {
      const data = await match.loader({ url });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ type: "data", value: data }));
      return;
    } catch (error) {
      const formattedError = formatError(error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify(formattedError));
    }
  }

  const matchPreparationPromises = [];
  for (const match of matches) {
    matchPreparationPromises.push(prepareMatch(match, url));
  }
  await Promise.all(matchPreparationPromises);

  const { abort, pipe } = renderToPipeableStream(
    <MatchRenderer matches={matches} />,
    {
      onShellReady() {
        clearInterval(timeout);
        res.writeHead(200, { "Content-Type": "text/html" });
        pipe(res);
      },
      onShellError(error) {
        console.error(error);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal server error");
      },
      onError(error) {
        console.error(error);
      },
    }
  );
  const timeout = setTimeout(() => {
    abort();
  }, RENDER_TIMEOUT);
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
