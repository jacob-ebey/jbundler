export function loader() {
  return {
    message: "Welcome to JBundler!",
  };
}

export default async function IndexRoute({ data }) {
  return (
    <main>
      <h2>{data.message}</h2>
      <p>
        <a href="/about">About</a>
      </p>
    </main>
  );
}
