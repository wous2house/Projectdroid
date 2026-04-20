import PocketBase from 'pocketbase';

// VITE_POCKETBASE_URL can be set in .env.local to point to the production database or another local instance
export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090');

// Disable auto cancellation for concurrent requests (useful for React Strict Mode / async loops)
pb.autoCancellation(false);

export default pb;
