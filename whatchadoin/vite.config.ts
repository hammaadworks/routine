import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()], resolve: {
        tsconfigPaths: true
    }, build: {
        chunkSizeWarningLimit: 1000, rollupOptions: {
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
    }, server: {
        allowedHosts: ["alhamdulillahs-macbook-pro.local"]
    }
})
