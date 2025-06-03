import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = env.VITE_API_BASE_URL || 'http://localhost:3000';
  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/users': apiBase,
        '/cubicles': apiBase,
        '/reserve': apiBase,
        '/report': apiBase,
        '/api': apiBase,
        '/test-stats-update': apiBase,
        // Add WebSocket proxy for socket.io
        '/socket.io': {
          target: apiBase,
          changeOrigin: true,
          ws: true
        }
      },
    },
  };
});
