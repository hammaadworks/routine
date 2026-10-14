import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
function chromeLauncherPlugin() {
    return {
        name: 'chrome-launcher',
        configureServer(server) {
            server.middlewares.use('/api/launch-chrome', async (req, res) => {
                try {
                    const parsedUrl = new URL(req.url || '', 'http://localhost');
                    const profile = parsedUrl.searchParams.get('profile') || 'Default';
                    const targetUrl = parsedUrl.searchParams.get('url') || 'https://google.com';
                    const { execFile } = await import('child_process');
                    execFile('open', ['-n', '-a', 'Google Chrome', '--args', `--profile-directory=${profile}`, targetUrl], (err) => {
                        res.setHeader('Content-Type', 'application/json');
                        if (err) {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: err.message }));
                        }
                        else {
                            res.statusCode = 200;
                            res.end(JSON.stringify({ success: true }));
                        }
                    });
                }
                catch (e) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: e?.message || 'Failed to launch Chrome' }));
                }
            });
        }
    };
}
// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), chromeLauncherPlugin()],
    resolve: {
        tsconfigPaths: true
    },
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('recharts') || id.includes('d3-'))
                            return 'recharts';
                        if (id.includes('lucide-react'))
                            return 'lucide';
                        if (id.includes('@uiw') || id.includes('react-md-editor') || id.includes('react-markdown'))
                            return 'markdown-editor';
                        if (id.includes('animejs'))
                            return 'animejs';
                        return 'vendor';
                    }
                }
            }
        }
    },
    server: {
        allowedHosts: ["alhamdulillahs-macbook-pro.local"]
    }
});
