import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Netlify sets COMMIT_REF during builds; it lets you see on the phone which version is running.
const version = (process.env.COMMIT_REF ?? 'dev').slice(0, 7)

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt': a new service worker waits until you tap "Update", so a lesson
      // is never reloaded out from under you.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Malayalam & Bangla',
        short_name: 'Bhasha',
        description: 'Personal Malayalam reading and Bangla speaking trainer',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#14161c',
        theme_color: '#14161c',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell only. Audio is downloaded per unit by the app into its own
        // cache, so it is never part of the precache.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,webmanifest}'],
        globIgnores: ['audio/**'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/audio\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
