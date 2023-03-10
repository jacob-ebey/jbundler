"use client";

import * as React from "react";

import { SC } from "./sc.jsx";

export function Counter({ initialValue = 0 }) {
  const [count, setCount] = React.useState(initialValue);
  return (
    <div>
      <p>
        Count: {count} {React.useId()}
      </p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <div className="counter-children">
        <SC label={"SC " + count} />
      </div>
    </div>
  );
}
