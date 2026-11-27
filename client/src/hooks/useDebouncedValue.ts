import { useEffect, useState } from 'react';

/** Every search box waits this long after the last keystroke before calling the API ("fff" = 1 call, not 3). */
export const SEARCH_DEBOUNCE_MS = 800;

export function useDebouncedValue<T>(value: T, delayMs: number = SEARCH_DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
