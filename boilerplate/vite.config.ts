import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The Cloudflare plugin reads wrangler.jsonc, runs your Worker (API) alongside the React app during
// `npm run dev`, and builds both for `npm run deploy`. No extra configuration needed.
export default defineConfig({
  plugins: [react(), cloudflare()],
})
