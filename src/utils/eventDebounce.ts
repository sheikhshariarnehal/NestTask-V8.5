/**
 * Creates a debounced event handler that prevents rapid-fire executions
 * Only the last call within the delay window will execute
 */
export function createDebouncedEventHandler(
  handler: () => void | Promise<void>,
  delay: number
): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let isProcessing = false;

  return () => {
    // Clear pending timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Don't queue another if already processing
    if (isProcessing) {
      console.log('[EventDebounce] Handler already processing, skipping');
      return;
    }

    timeoutId = setTimeout(async () => {
      isProcessing = true;
      try {
        await handler();
      } finally {
        isProcessing = false;
      }
    }, delay);
  };
}
