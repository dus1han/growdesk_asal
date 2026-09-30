"use client";

import { useEffect, useState } from "react";

/** The value, updated only after it has stopped changing for `delay` ms. For search-as-you-type. */
export function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
