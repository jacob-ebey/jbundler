export async function loader() {
  return {
    message: "About page!",
  };
}

export default function AboutRoute({ data }) {
  return (
    <main>
      <h2>{data.message}</h2>
      <p>
        <a href="/">Home</a>
      </p>
    </main>
  );
}
