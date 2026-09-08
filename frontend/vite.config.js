import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
// https://vite.dev/config/
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    build: {
        outDir: '../public',
        emptyOutDir: true,
    },
    server: {
        port: 5173,
        host: true,
        proxy: {
            '/api': {
                target: 'http://localhost:3333',
                changeOrigin: true,
                ws: true,
                configure: (proxy) => {
                    proxy.on('error', (err, _req, res) => {
                        if (res && res.writeHead && !res.headersSent) {
                            res.writeHead(503, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                errors: [{ message: `Backend offline at localhost:3333 (${err.code || 'ECONNREFUSED'})` }]
                            }));
                        }
                    });
                }
            }
        }
    }
});
