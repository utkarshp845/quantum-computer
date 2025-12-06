import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    
    // Log for debugging (only in dev mode)
    if (mode === 'development') {
      console.log('🔍 Vite Config - Environment Variables:');
      console.log('  VITE_OPENROUTER_API_KEY:', env.VITE_OPENROUTER_API_KEY ? '***SET***' : 'NOT SET');
      console.log('  OPENROUTER_API_KEY:', env.OPENROUTER_API_KEY ? '***SET***' : 'NOT SET');
      console.log('  VITE_AI_MODEL from env:', env.VITE_AI_MODEL || 'NOT SET');
      console.log('  AI_MODEL from env:', env.AI_MODEL || 'NOT SET');
      console.log('  Final model used:', env.VITE_AI_MODEL || env.AI_MODEL || 'meta-llama/llama-3.2-3b-instruct:free');
    }
    
    const apiKey = env.VITE_OPENROUTER_API_KEY || env.OPENROUTER_API_KEY || '';
    const model = env.VITE_AI_MODEL || env.AI_MODEL || 'meta-llama/llama-3.2-3b-instruct:free';
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Expose OpenRouter API key and model selection
        'import.meta.env.VITE_OPENROUTER_API_KEY': JSON.stringify(apiKey),
        'import.meta.env.VITE_AI_MODEL': JSON.stringify(model),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Production optimizations
        minify: 'esbuild',
        target: 'esnext',
        sourcemap: false,
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
            },
          },
        },
        chunkSizeWarningLimit: 1000,
      },
      optimizeDeps: {
        include: ['react', 'react-dom'],
      },
    };
});
