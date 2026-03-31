import PocketBase from 'pocketbase';

export const pb = new PocketBase('http://db.projectdroid.nl');

// Disable auto cancellation for concurrent requests (useful for React Strict Mode / async loops)
pb.autoCancellation(false);

export default pb;
