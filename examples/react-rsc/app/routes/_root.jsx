const js = String.raw;

export default function Root({ children }) {
  return (
    <html>
      <head>
        <title>React Example</title>
      </head>
      <body>
        <h1>Hello, World!</h1>

        {children}

        <script
          dangerouslySetInnerHTML={{
            __html: js`
window._rsc = { encoder: new TextEncoder() };
window._rsc.response = new Response(new ReadableStream({
  start(controller) {
    window._rsc.controller = controller;
  }
}), { headers: { "Content-Type": "text/plain" } });
`,
          }}
        />
      </body>
    </html>
  );
}

export function ErrorBoundary({ error }) {
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
          dangerouslySetInnerHTML={{
            __html: js`
window._rsc = { encoder: new TextEncoder() };
window._rsc.response = new Response(new ReadableStream({
  start(controller) {
    window._rsc.controller = controller;
  }
}), { headers: { "Content-Type": "text/plain" } });
`,
          }}
        />
      </body>
    </html>
  );
}
