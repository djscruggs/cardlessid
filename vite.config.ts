import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  // server: {
  //   host: '0.0.0.0', // This allows connections from all network interfaces
  //   hmr: {
  //     host: '*.ngrok-free.app', // Add your ngrok URL here
  //     clientPort: 443, // The default port for HTTPS
  //   },
  // },
})
