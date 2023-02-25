export default function Html({ children, scripts }) {
  return (
    <html>
      <head>
        <title>React Example</title>
      </head>
      <body>
        <div id="app">{children}</div>
        {scripts}
      </body>
    </html>
  );
}
