import PocketBase from 'pocketbase';

// Smart fallback based on Vite's environment mode
const defaultUrl = import.meta.env.MODE === 'production'
  ? 'https://db.projectdroid.nl'
  : 'https://db-dev.projectdroid.nl';

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || defaultUrl);

// Disable auto cancellation for concurrent requests (useful for React Strict Mode / async loops)
pb.autoCancellation(false);

export default pb;
