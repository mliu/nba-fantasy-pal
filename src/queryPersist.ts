import { del, get, set } from "idb-keyval";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

const KEY = "nba-fantasy-pal-query-cache";

// 24 days: long enough that finished games/weeks stay cached across sessions. Keep this under
// 2^31-1 ms (~24.8 days): it's also the gcTime, and setTimeout overflows past that, which makes
// react-query garbage-collect every unobserved (i.e. just-restored) query immediately.
export const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24 * 24;
// Bump to invalidate every persisted entry (e.g. when a cached data shape changes)
export const PERSIST_BUSTER = "v2";

// IndexedDB rather than localStorage: ~150 player game logs won't fit in its ~5MB quota
export const idbPersister: Persister = {
    persistClient: (client: PersistedClient) => set(KEY, client),
    restoreClient: () => get<PersistedClient>(KEY),
    removeClient: () => del(KEY),
};

// Only queries that opt in via `meta: { persist: true }` are written to IndexedDB. Use it for
// data that's immutable (finished games/weeks) or expensive to refetch, not for live state.
export const persistMeta = { persist: true } as const;
