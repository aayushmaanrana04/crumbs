import type { WxtStorageItem } from '#imports';

/** Reactive view of a WXT storage item; updates when it changes anywhere in the extension. */
export function stored<T>(item: WxtStorageItem<T, Record<string, unknown>>): { readonly value: T | undefined } {
  let value = $state<T | undefined>(undefined);
  $effect(() => {
    item.getValue().then((v) => (value = v));
    return item.watch((next) => (value = next ?? undefined));
  });
  return {
    get value() {
      return value;
    },
  };
}
