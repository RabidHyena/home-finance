export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    // Unregister any existing service workers so stale cached JS doesn't
    // survive between deployments. This app runs on localhost — offline
    // support is not needed and the SW cache was causing stale code delivery.
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
}
