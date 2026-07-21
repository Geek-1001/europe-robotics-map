import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  output: 'static',
  site: 'https://europe-robotics-map.netlify.app',
  vite: {
    build: {
      sourcemap: true,
    },
  },
});
