export function formatError(error) {
  if (error instanceof Error) {
    return {
      type: "error",
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    type: "unknown-error",
    value: error,
  };
}
