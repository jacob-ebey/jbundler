import buildTarget from "jbundler/build-target";

import { formatError } from "../util.js";

export default function Root({ matches, children }) {
  return (
    <html>
      <head>
        <title>React Example</title>
      </head>
      <body>
        <h1>Hello, World!</h1>

        {children}

        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html:
              buildTarget === "browser" ? " " : serializeMatchData(matches),
          }}
        />
      </body>
    </html>
  );
}

export function ErrorBoundary({ matches, error }) {
  let message, stack;
  if (error instanceof Error) {
    message = error.message;
    stack = error.stack;
  } else if (typeof error === "object" && "message" in error) {
    message = error.message;
    stack = error.stack;
  } else {
    message = String(error);
  }

  return (
    <html>
      <head>
        <title>React Example</title>
      </head>
      <body>
        <h1>Error Boundary</h1>
        <p>{message}</p>
        <pre>
          <code>{stack}</code>
        </pre>

        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html:
              buildTarget === "browser" ? " " : serializeMatchData(matches),
          }}
        />
      </body>
    </html>
  );
}

function serializeMatchData(matches) {
  const toSerialize = {};
  for (const match of matches) {
    if (match.error !== undefined) {
      toSerialize[match.id] = formatError(match.error);
    } else {
      toSerialize[match.id] = {
        type: "data",
        value: match.data || null,
      };
    }
  }

  return escapeHtml(`window.__matchData = ${JSON.stringify(toSerialize)};`);
}

const ESCAPE_LOOKUP = {
  "&": "\\u0026",
  ">": "\\u003e",
  "<": "\\u003c",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

const ESCAPE_REGEX = /[&><\u2028\u2029]/g;

/**
 * @param {string} html
 */
function escapeHtml(html) {
  return html.replace(ESCAPE_REGEX, (match) => ESCAPE_LOOKUP[match]);
}
