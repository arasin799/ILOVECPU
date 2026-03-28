// Backend base URL injected from the Vite environment.
// Used when the frontend needs to call the API or build image URLs.
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";
