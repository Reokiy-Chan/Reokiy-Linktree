// Service worker for the "notify me" Fansly live notifications

self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Live on Fansly', {
      body: data.body || '',
      icon: '/images/logo.png',
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data && event.notification.data.url
  // Only ever open https links (the server sends the stream URL)
  if (url && /^https:\/\//.test(url)) event.waitUntil(clients.openWindow(url))
})
