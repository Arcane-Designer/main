// Where this copy keeps its data.
// 'code': your own Blastforge, synced between devices with a connection code through its own Worker.
// 'account': the copy on Sarge & Deputy Games (tools/publish-to-sd.sh writes that version of this file):
// everyone signs in with their games account, and each account's data syncs privately to that site.
export const MODE = 'code';
// The published app will use its own Worker; local QA uses the local Worker.
export const SYNC_ENDPOINT = ['localhost','127.0.0.1'].includes(location.hostname)
  ? 'http://127.0.0.1:8798/sync'
  : 'https://blastforge-sync.nathanagellatly.workers.dev/sync';
