import entryScript from "jbundler/client-entry";

export default function Html() {
  return (
    <html>
      <head>
        <title>React Example</title>
      </head>
      <body>
        <div id="app" />
        <script type="module" src={entryScript} />
      </body>
    </html>
  );
}
