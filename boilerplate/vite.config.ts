import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'

// The Cloudflare plugin reads wrangler.jsonc, runs your Worker (API) alongside the React app during
// `npm run dev`, and builds both for `npm run deploy`. No extra configuration needed.
export default defineConfig({
  plugins: [react(), cloudflare()],
})
