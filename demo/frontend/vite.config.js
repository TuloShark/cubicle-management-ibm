import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const config = {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  };

  // Only add proxy configuration in development mode
  if (mode === 'development') {
    const apiBase = env.VITE_API_BASE_URL || 'http://localhost:3000';
    config.server = {
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
      }
    };
  }

  return config;
});
