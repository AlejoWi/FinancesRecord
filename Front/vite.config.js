import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // The frontend dev server runs on the HOST. The backend in dev also
      // runs on the HOST (npm --prefix Back run dev). So the proxy target
      // is localhost:3000, NOT the docker compose service name.
      //
      // cookieDomainRewrite: '' (per spec R-PROXY-07) strips any Domain
      // attribute the backend might set on Set-Cookie, so the browser
      // scopes the session cookie to the request origin (localhost:5173).
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: false,
        cookieDomainRewrite: '',
      },
    },
  },
});
