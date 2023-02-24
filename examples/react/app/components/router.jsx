import * as React from "react";
import { matchTrie } from "router-trie";

/** @type {import("./router.js").MatchRenderer} */
export function MatchRenderer({ routes, matches: initialMatches }) {
  const [matches, setMatches] = React.useState(() => initialMatches);

  React.useEffect(() => {
    if (!routes) return;

    const updateDOM = async (url, signal) => {
      const matches = matchTrie(routes, url.pathname);
      if (!matches) {
        location.href = url.href;
        return;
      }

      const matchPreparationPromises = [];
      for (const match of matches) {
        matchPreparationPromises.push(prepareMatch(match, url, signal));
      }
      await Promise.all(matchPreparationPromises);

      if (!signal.aborted) {
        setMatches(matches);
        if (!window.navigation) {
          window.history.pushState(null, "", url.href);
        }
      }
    };

    const handlePopState = async (event) => {
      const url = new URL(location.href);
      if (url.origin !== location.origin) {
        return;
      }

      if (lastAbortController) {
        lastAbortController.abort();
      }
      lastAbortController = new AbortController();
      const signal = lastAbortController.signal;

      if (!document.startViewTransition) {
        await updateDOM(url, signal);
        return;
      } else {
        const transition = document.startViewTransition(async () => {
          await updateDOM(url, signal);
        });
        signal.addEventListener(
          "abort",
          () => {
            transition.skipTransition();
          },
          { once: true }
        );
        await transition.domUpdated;
      }
    };

    /**
     * @param {MouseEvent} event
     */
    const handleLinkClick = async (event) => {
      const element = /** @type {Element} */ (event.target);
      const origin = element?.closest(`a`);

      if (origin) {
        const url = new URL(origin.href);
        if (url.origin !== location.origin) {
          return;
        }

        if (lastAbortController) {
          lastAbortController.abort();
        }
        lastAbortController = new AbortController();
        const signal = lastAbortController.signal;

        event.preventDefault();

        if (!document.startViewTransition) {
          await updateDOM(url, signal);
          return;
        } else {
          const transition = document.startViewTransition(async () => {
            await updateDOM(url, signal);
          });
          signal.addEventListener(
            "abort",
            () => {
              transition.skipTransition();
            },
            { once: true }
          );
          await transition.domUpdated;
        }
      }
    };

    /** @type {AbortController | undefined} */
    let lastAbortController;
    /**
     * @param {NavigateEvent} event
     */
    const handleNavigate = (event) => {
      if (!event.canIntercept || event.hashChange || event.downloadRequest) {
        return;
      }

      const url = new URL(event.destination.url);
      if (url.origin !== location.origin) {
        return;
      }

      if (lastAbortController) {
        lastAbortController.abort();
      }
      lastAbortController = new AbortController();
      const signal = lastAbortController.signal;

      event.intercept({
        async handler() {
          if (!document.startViewTransition) {
            await updateDOM(url, signal);
            return;
          } else {
            const transition = document.startViewTransition(async () => {
              await updateDOM(url, signal);
            });
            signal.addEventListener(
              "abort",
              () => {
                transition.skipTransition();
              },
              { once: true }
            );
            await transition.domUpdated;
          }
        },
      });
    };

    if (!window.navigation) {
      window.addEventListener("popstate", handlePopState);
      window.addEventListener("click", handleLinkClick);
    } else {
      window.navigation.addEventListener("navigate", handleNavigate);
    }
    return () => {
      if (!window.navigation) {
        window.removeEventListener("popstate", handlePopState);
        window.removeEventListener("click", handleLinkClick);
      } else {
        window.navigation.removeEventListener("navigate", handleNavigate);
      }
      if (lastAbortController) {
        lastAbortController.abort();
        lastAbortController = undefined;
      }
    };
  }, [routes, setMatches]);

  return React.useMemo(() => createElementsFromMatches(matches), [matches]);
}

function createElementsFromMatches(matches) {
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

/**
 * @param {any} match
 * @param {URL} url
 * @param {AbortSignal} signal
 */
async function prepareMatch(match, url, signal) {
  if (match.loader) {
    try {
      const fetchURL = new URL(url);
      fetchURL.searchParams.set("_data", match.id);
      const data = await fetch(fetchURL.href, { signal }).then((response) =>
        response.json()
      );
      switch (data?.type) {
        case "data":
          match.data = data.value;
          break;
        case "error":
          match.error = new Error(data.message);
          match.error.stack = data.stack;
          break;
        case "unknown-error":
          match.error = data.value;
          break;
      }
    } catch (error) {
      match.error = error || null;
    }
  }
}
