// This SW immediately unregisters itself and reloads all clients.
// Replaces the previous workbox SW so old cached JS is no longer served.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', async () => {
  await self.registration.unregister();
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => client.navigate(client.url));
});
