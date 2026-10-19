// The published app will use its own Worker; local QA uses the local Worker.
export const SYNC_ENDPOINT = ['localhost','127.0.0.1'].includes(location.hostname)
  ? 'http://127.0.0.1:8798/sync'
  : 'https://blastforge-sync.nathanagellatly.workers.dev/sync';
