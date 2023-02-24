import { Counter } from "../components/counter.jsx";

export function loader() {
  return {
    message: "Welcome to JBundler!",
  };
}

export default function IndexRoute({ data }) {
  return (
    <main>
      <h2>{data.message}</h2>
      <p>
        <a href="/about">About</a>
      </p>
      <Counter />
    </main>
  );
}
