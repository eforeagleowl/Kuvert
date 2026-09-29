// Posters for the built-in list, from TMDB, so everyone sees them without a TMDB key of their own.
// Written by tools/posters.mjs; the "Refresh posters" workflow runs it every month. TMDB's terms allow
// keeping its data for six months, so Kuvert stops using these once they're older than that.
export const POSTERS_AT = null; // the day they were fetched, "YYYY-MM-DD"
export const POSTERS = {}; // film id → [TMDB id, poster path]
