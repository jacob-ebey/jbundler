"use client";
import * as React from "react";

/** @type {import("./router.js").MatchRenderer} */
export function MatchRenderer({ matches }) {
  return createElementsFromMatches(matches);
}

export function createElementsFromMatches(matches) {
  let previousElement = null;
  let errorToHandle = undefined;
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const { Component, ErrorBoundary, data, error } = match;
    errorToHandle = error || errorToHandle;
    if (errorToHandle !== undefined) {
      if (!ErrorBoundary) {
        continue;
      }
      previousElement = (
        <ErrorBoundary matches={matches} error={errorToHandle}>
          {previousElement}
        </ErrorBoundary>
      );
      if (i > 0) {
        previousElement = <React.Suspense>{previousElement}</React.Suspense>;
      }
      errorToHandle = undefined;
      continue;
    }

    if (Component) {
      previousElement = (
        <Component matches={matches} data={data}>
          {previousElement}
        </Component>
      );
      if (i > 0) {
        previousElement = <React.Suspense>{previousElement}</React.Suspense>;
      }
    }
  }
  return previousElement;
}
