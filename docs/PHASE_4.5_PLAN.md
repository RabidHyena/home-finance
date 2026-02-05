# Phase 4.5: Progressive Web App (PWA) - План Реализации

## Обзор

Превращение Home Finance в полноценное Progressive Web App для:
- Установки на мобильные устройства и десктоп
- Работы в офлайн режиме
- Быстрой загрузки через кеширование
- Нативного UX опыта

---

## Компоненты PWA

### 1. Web App Manifest
Файл `manifest.json` описывает приложение:
- Название и иконки
- Цвета темы
- Режим отображения (standalone)
- Стартовый URL

### 2. Service Worker
JavaScript файл работающий в фоне:
- Перехватывает сетевые запросы
- Кеширует ресурсы
- Обеспечивает офлайн режим
- Фоновая синхронизация

### 3. Иконки и Assets
Набор иконок для разных платформ:
- Android (192x192, 512x512)
- iOS (180x180 apple-touch-icon)
- Favicon (32x32, 16x16)

### 4. Offline UX
Страница/компонент для офлайн состояния:
- Информативное сообщение
- Показ закешированных данных
- Индикация отсутствия сети

---

## Стратегия кеширования

### Cache-First (для статики)
```
Request → Cache → Network → Cache → Response
```
Использовать для:
- JS/CSS бандлы
- Иконки, шрифты
- Изображения

### Network-First (для данных)
```
Request → Network → Cache → Response (fallback to Cache)
```
Использовать для:
- API запросы
- Динамические данные
- Транзакции, отчеты

### Stale-While-Revalidate
```
Request → Cache (fast) → Update from Network (background)
```
Использовать для:
- Списки транзакций
- Отчеты

---

## Реализация

### Шаг 1: Создать Web App Manifest

**Файл:** `frontend/public/manifest.json`

```json
{
  "name": "Home Finance",
  "short_name": "Finance",
  "description": "Personal finance tracking with AI-powered receipt parsing",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Шаг 2: Создать Service Worker

**Файл:** `frontend/public/service-worker.js`

```javascript
const CACHE_NAME = 'home-finance-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  // Note: Vite bundles will be added dynamically
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests - Network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((cached) => {
            return cached || new Response(JSON.stringify({ error: 'Offline' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Static assets - Cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.ok && request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Fallback to offline page for navigation requests
        if (request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      });
    })
  );
});
```

### Шаг 3: Регистрация Service Worker

**Файл:** `frontend/src/registerSW.ts`

```typescript
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New SW available, notify user
                  if (confirm('Доступно обновление приложения. Обновить сейчас?')) {
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });
    });
  }
}
```

**Вызвать в** `frontend/src/main.tsx`:

```typescript
import { registerServiceWorker } from './registerSW';

// After ReactDOM.createRoot()
registerServiceWorker();
```

### Шаг 4: Обновить index.html

**Файл:** `frontend/index.html`

Добавить в `<head>`:

```html
<!-- PWA Meta Tags -->
<meta name="theme-color" content="#3b82f6" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Finance" />

<!-- Manifest -->
<link rel="manifest" href="/manifest.json" />

<!-- Icons -->
<link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
```

### Шаг 5: Создать Offline страницу

**Файл:** `frontend/public/offline.html`

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Офлайн - Home Finance</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 { font-size: 3rem; margin: 0 0 1rem; }
    p { font-size: 1.25rem; opacity: 0.9; }
    .icon { font-size: 5rem; margin-bottom: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>Нет соединения</h1>
    <p>Проверьте подключение к интернету</p>
  </div>
</body>
</html>
```

### Шаг 6: Создать иконки

Использовать онлайн генератор (например, https://realfavicongenerator.net/):
- Загрузить логотип/иконку
- Сгенерировать все размеры
- Поместить в `frontend/public/icons/`

Требуемые размеры:
- icon-16.png (16x16)
- icon-32.png (32x32)
- icon-192.png (192x192)
- icon-512.png (512x512)
- apple-touch-icon.png (180x180)

### Шаг 7: Offline индикатор (опционально)

**Компонент:** `frontend/src/components/OfflineIndicator.tsx`

```typescript
import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '0.75rem 1.5rem',
      backgroundColor: '#ef4444',
      color: 'white',
      borderRadius: '2rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: 9999,
    }}>
      <WifiOff size={20} />
      <span>Нет соединения</span>
    </div>
  );
}
```

Добавить в `Layout.tsx` или `App.tsx`.

---

## Конфигурация Vite

**Файл:** `frontend/vite.config.ts`

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'offline.html'],
      manifest: false, // Use our custom manifest.json
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
    }),
  ],
});
```

Установить зависимость:
```bash
npm install -D vite-plugin-pwa
```

---

## Тестирование PWA

### Chrome DevTools
1. Открыть DevTools → Application
2. Проверить Manifest
3. Проверить Service Workers
4. Проверить Cache Storage
5. Offline mode (Network throttling)

### Lighthouse
1. DevTools → Lighthouse
2. Выбрать "Progressive Web App"
3. Generate report
4. Исправить проблемы

### Установка
1. Desktop Chrome: иконка + в адресной строке
2. Mobile: "Add to Home Screen"

---

## Критерии успеха

✅ Manifest.json валидный
✅ Service Worker регистрируется
✅ Приложение работает офлайн
✅ Lighthouse PWA score > 90
✅ Можно установить на устройство
✅ Статика кешируется
✅ API requests кешируются
✅ Показывается offline индикатор

---

*План создан: 5 февраля 2026*
