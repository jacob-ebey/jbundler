import * as React from "react";
import { createTrie } from "router-trie";

import * as root from "./routes/_root.jsx";
import * as index from "./routes/_index.jsx";
import * as about from "./routes/about.jsx";

const IndexRoute = React.lazy(() => import("./routes/_index.jsx"));
const AboutRoute = React.lazy(() => import("./routes/about.jsx"));

export default createTrie([
  {
    id: "root",
    Component: root.default,
    ErrorBoundary: root.ErrorBoundary,
    children: [
      {
        id: "index",
        index: true,
        loader: index.loader,
        Component: IndexRoute,
      },
      {
        id: "about",
        path: "about",
        loader: about.loader,
        Component: AboutRoute,
      },
    ],
  },
]);
