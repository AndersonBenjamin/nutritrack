import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Em desenvolvimento a API roda em localhost:3000 (npm run dev em apps/api)
    proxy: { '/api': 'http://localhost:3000' },
  },
});
