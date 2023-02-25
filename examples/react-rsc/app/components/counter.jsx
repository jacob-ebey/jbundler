"use client";

import * as React from "react";

export function Counter({ initialValue = 0 }) {
  const [count, setCount] = React.useState(initialValue);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
