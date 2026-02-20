self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  const payload = event.data.json();
  const { title, body, icon, badge, url, data, senderIcon, timestamp } = payload;
  
  const notificationTitle = 'Ringchat';
  
  const timeStr = timestamp 
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  
  const notificationBody = title 
    ? `${title}\n${body}\n${timeStr}`
    : `${body}\n${timeStr}`;
  
  const options = {
    body: notificationBody,
    icon: '/logo.svg',
    badge: '/logo.svg',
    image: senderIcon || icon,
    data: { url: url || '/home/notifications', ...data },
    vibrate: [100, 50, 100],
    requireInteraction: false,
    tag: data?.conversationId || 'ringchat-notification',
    renotify: true,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/home/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes('/home') && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});
