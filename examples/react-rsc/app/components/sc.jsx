"use server";

import { Counter2 } from "./counter2.jsx";

const p = Promise.resolve("test");

export async function SC({ label }) {
  const m = await p;
  return (
    <>
      <p>
        A server component {label} {m}.
      </p>
      <Counter2 initialValue={2} />
    </>
  );
}
