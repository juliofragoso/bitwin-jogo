import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // MQTT.js requires global to be defined in some environments
    global: 'window',
  },
  resolve: {
    alias: {
      // Polyfill buffer for the browser
      buffer: 'buffer/',
    },
  },
})