"use client";

import * as React from "react";

export function Counter2({ initialValue = 0 }) {
  const [count, setCount] = React.useState(initialValue);
  return (
    <div>
      <p>
        Count2: {count} {React.useId()}
      </p>
      <button onClick={() => setCount(count + 2)}>Increment2</button>
    </div>
  );
}
