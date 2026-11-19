import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.resolve(__dirname, 'data')
const STATE_FILE = path.resolve(DATA_DIR, 'routine.json')
const SYNC_CONFIG_FILE = path.resolve(__dirname, '.sync_config.json')

function localDevBridgePlugin() {
    return {
        name: 'local-dev-bridge',
        configureServer(server: any) {
            server.middlewares.use(async (req: any, res: any, next: any) => {
                const url = req.url?.split('?')[0]

                if (url === '/api/health' && req.method === 'GET') {
                    res.setHeader('Content-Type', 'application/json')
                    res.statusCode = 200
                    res.end(JSON.stringify({ status: 'ok', file: STATE_FILE, exists: fs.existsSync(STATE_FILE) }))
                    return
                }

                if (url === '/api/sync-config') {
                    res.setHeader('Content-Type', 'application/json')
                    if (req.method === 'GET') {
                        if (fs.existsSync(SYNC_CONFIG_FILE)) {
                            res.statusCode = 200
                            res.end(fs.readFileSync(SYNC_CONFIG_FILE, 'utf-8'))
                        } else {
                            res.statusCode = 404
                            res.end(JSON.stringify({ error: 'No sync config found' }))
                        }
                        return
                    }
                    if (req.method === 'POST') {
                        let body = ''
                        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
                        req.on('end', () => {
                            try {
                                const parsed = JSON.parse(body)
                                fs.writeFileSync(SYNC_CONFIG_FILE, JSON.stringify(parsed, null, 2), 'utf-8')
                                res.statusCode = 200
                                res.end(JSON.stringify({ success: true }))
                            } catch (err: any) {
                                res.statusCode = 400
                                res.end(JSON.stringify({ error: err?.message || 'Invalid JSON' }))
                            }
                        })
                        return
                    }
                }

                if (url === '/api/state') {
                    res.setHeader('Content-Type', 'application/json')

                    if (req.method === 'GET') {
                        try {
                            if (fs.existsSync(STATE_FILE)) {
                                const content = fs.readFileSync(STATE_FILE, 'utf-8')
                                res.statusCode = 200
                                res.end(content)
                            } else {
                                res.statusCode = 404
                                res.end(JSON.stringify({ error: 'State file not found' }))
                            }
                        } catch (err: any) {
                            res.statusCode = 500
                            res.end(JSON.stringify({ error: err?.message || 'Failed to read state' }))
                        }
                        return
                    }

                    if (req.method === 'POST') {
                        try {
                            let body = ''
                            req.on('data', (chunk: Buffer) => {
                                body += chunk.toString()
                            })
                            req.on('end', () => {
                                try {
                                    if (!fs.existsSync(DATA_DIR)) {
                                        fs.mkdirSync(DATA_DIR, { recursive: true })
                                    }
                                    const parsed = JSON.parse(body)
                                    const formatted = JSON.stringify(parsed, null, 2)
                                    const tmpFile = `${STATE_FILE}.tmp`
                                    fs.writeFileSync(tmpFile, formatted, 'utf-8')
                                    fs.renameSync(tmpFile, STATE_FILE)

                                    res.statusCode = 200
                                    res.end(JSON.stringify({ success: true, updatedAt: parsed.updatedAt }))
                                } catch (parseErr: any) {
                                    res.statusCode = 400
                                    res.end(JSON.stringify({ error: 'Invalid JSON payload', details: parseErr?.message }))
                                }
                            })
                        } catch (writeErr: any) {
                            res.statusCode = 500
                            res.end(JSON.stringify({ error: writeErr?.message || 'Failed to write state' }))
                        }
                        return
                    }
                }

                next()
            })
        }
    }
}

function chromeLauncherPlugin() {
    return {
        name: 'chrome-launcher',
        configureServer(server: any) {
            server.middlewares.use('/api/launch-chrome', async (req: any, res: any) => {
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
                        } else {
                            res.statusCode = 200;
                            res.end(JSON.stringify({ success: true }));
                        }
                    });
                } catch (e: any) {
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
    plugins: [react(), localDevBridgePlugin(), chromeLauncherPlugin()],
    resolve: {
        tsconfigPaths: true
    },
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        if (id.includes('recharts') || id.includes('d3-')) return 'recharts';
                        if (id.includes('lucide-react')) return 'lucide';
                        if (id.includes('@uiw') || id.includes('react-md-editor') || id.includes('react-markdown')) return 'markdown-editor';
                        if (id.includes('animejs')) return 'animejs';
                        return 'vendor';
                    }
                }
            }
        }
    },
    server: {
        allowedHosts: ["alhamdulillahs-macbook-pro.local"]
    }
})
