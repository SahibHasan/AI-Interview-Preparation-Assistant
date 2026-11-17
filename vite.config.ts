import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio / Cloud Run preview via DISABLE_HMR or K_SERVICE env vars.
      hmr: process.env.DISABLE_HMR !== 'true' && !process.env.K_SERVICE,
      // Disable file watching when HMR is disabled to prevent flickering and idle CPU load.
      watch: process.env.DISABLE_HMR === 'true' || Boolean(process.env.K_SERVICE) ? null : {},
    },
  };
});
