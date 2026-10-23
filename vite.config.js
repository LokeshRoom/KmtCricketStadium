import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom' },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const path = id.replaceAll('\\', '/');
          if (path.includes('/node_modules/firebase/auth/') || path.includes('/node_modules/@firebase/auth/')) return 'firebase-auth';
          if (path.includes('/node_modules/firebase/firestore/') || path.includes('/node_modules/@firebase/firestore/')) return 'firebase-firestore';
          if (path.includes('/node_modules/@firebase/') || path.includes('/node_modules/firebase/app/')) return 'firebase-core';
          if (/\/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(path)) return 'react-vendor';
          if (/\/node_modules\/(react-markdown|remark|micromark|mdast|hast|unist)[^/]*\//.test(path)) return 'markdown-vendor';
        },
      },
    },
  },
});
