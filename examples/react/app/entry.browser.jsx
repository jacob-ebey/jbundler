import { hydrateRoot } from "react-dom/client";
import { matchTrie } from "router-trie";

import { MatchRenderer } from "./components/router.jsx";
import routes from "./routes.jsx";

const matches = matchTrie(routes, location.pathname);
prepareMatches(matches);

hydrateRoot(document, <MatchRenderer routes={routes} matches={matches} />);

function prepareMatches(matches) {
  const matchData = window.__matchData;

  for (const match of matches) {
    const data = matchData[match.id];
    switch (data?.type) {
      case "data":
        match.data = data.value;
        break;
      case "error":
        match.error = new Error(data.message);
        match.error.stack = data.stack;
        break;
      case "unknown-error":
        match.error = data.value;
        break;
    }
  }
}
