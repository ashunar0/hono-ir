import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'
import { inertiaPages } from '@hono/inertia/vite'

export default defineConfig({
  plugins: [
    inertiaPages({ serverModule: '../src/server' }),
    cloudflare(),
    ssrPlugin(),
    tailwindcss(),
  ],
})
