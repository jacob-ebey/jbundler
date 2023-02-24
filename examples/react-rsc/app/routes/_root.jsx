export default function Root({ children }) {
  return (
    <>
      <h1>Hello, World!</h1>
      {children}
    </>
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
    <>
      <h1>Error Boundary</h1>
      <p>{message}</p>
      <pre>
        <code>{stack}</code>
      </pre>
    </>
  );
}
