import PocketBase from 'pocketbase';

const pbUrl = import.meta.env.VITE_PB_URL || 'https://db-dev.projectdroid.nl';
export const pb = new PocketBase(pbUrl);

// Disable auto cancellation for concurrent requests (useful for React Strict Mode / async loops)
pb.autoCancellation(false);

export default pb;
