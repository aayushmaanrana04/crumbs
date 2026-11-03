import { liveQuery } from 'dexie';

/** Reactive Dexie query for Svelte 5: re-runs whenever the underlying tables change. */
export function live<T>(query: () => Promise<T> | T, initial: T): { readonly value: T } {
  let value = $state(initial);
  $effect(() => {
    const subscription = liveQuery(query).subscribe({
      next: (result) => (value = result),
      error: (error) => console.error('[live]', error),
    });
    return () => subscription.unsubscribe();
  });
  return {
    get value() {
      return value;
    },
  };
}
