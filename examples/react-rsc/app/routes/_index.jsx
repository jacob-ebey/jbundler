export function loader() {
  return {
    message: "Welcome to JBundler!",
  };
}

export default async function IndexRoute({ data }) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return (
    <main>
      <h2>{data.message}</h2>
      <p>
        <a href="/about">About</a>
      </p>
    </main>
  );
}
