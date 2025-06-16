import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = env.VITE_API_BASE_URL || 'http://localhost:3000';
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      proxy: {
        '/users': apiBase,
        '/cubicles': apiBase,
        '/reserve': apiBase,
        '/report': apiBase,
        '/api': apiBase,
        '/test-stats-update': apiBase,
        '/socket.io': {
          target: apiBase,
          changeOrigin: true,
          ws: true
        }
      },
    },
  };
});
