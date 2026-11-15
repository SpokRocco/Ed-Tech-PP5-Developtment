import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function localVercelApiPlugin() {
  return {
    name: 'pp5-local-vercel-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const [k, v] of Object.entries(env)) {
        if (!(k in process.env)) process.env[k] = v;
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();

        try {
          const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:8080'}`);
          const cleanName = parsedUrl.pathname.replace(/^\/api\//, '').replace(/\/+$/, '');
          if (!cleanName || cleanName.includes('..') || cleanName.includes('/')) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Not found' }));
            return;
          }

          const handlerPath = path.resolve(process.cwd(), 'api', `${cleanName}.js`);
          if (!fs.existsSync(handlerPath)) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: `API endpoint /api/${cleanName} not found` }));
            return;
          }

          const mod = await server.ssrLoadModule(`/api/${cleanName}.js`);
          const method = (req.method || 'GET').toUpperCase();
          const handler = mod[method];
          if (typeof handler !== 'function') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: `Method ${method} not allowed` }));
            return;
          }

          const chunks = [];
          if (method !== 'GET' && method !== 'HEAD') {
            for await (const chunk of req) chunks.push(chunk);
          }
          const rawBody = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) {
            if (Array.isArray(v)) v.forEach((item) => headers.append(k, item));
            else if (v !== undefined) headers.set(k, String(v));
          }

          const webRequest = new Request(parsedUrl.toString(), {
            method,
            headers,
            body: rawBody,
          });

          const webResponse = await handler(webRequest);
          res.statusCode = webResponse.status;
          const setCookies =
            typeof webResponse.headers.getSetCookie === 'function'
              ? webResponse.headers.getSetCookie()
              : [];

          webResponse.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') return;
            res.setHeader(key, value);
          });
          if (setCookies.length > 0) {
            res.setHeader('Set-Cookie', setCookies);
          } else if (webResponse.headers.has('set-cookie')) {
            res.setHeader('Set-Cookie', webResponse.headers.get('set-cookie'));
          }

          const buf = Buffer.from(await webResponse.arrayBuffer());
          res.end(buf);
        } catch (err) {
          console.error('[vite local api middleware]', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: err?.message || 'Internal Server Error' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localVercelApiPlugin()],
  server: {
    port: 8080,
    host: true,
    strictPort: true,
  },
  preview: {
    port: 8080,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-office': ['xlsx', 'papaparse', 'docx'],
          'vendor-pdf': ['jspdf', 'html2canvas'],
        },
      },
    },
  },
});
