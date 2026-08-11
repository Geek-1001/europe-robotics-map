import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  output: 'static',
  site: 'https://europeroboticsmap.com',
  vite: {
    build: {
      sourcemap: true,
    },
  },
});
