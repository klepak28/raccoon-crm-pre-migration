import { handleRoute } from './api/routes.js';
import { createContext } from './bootstrap/create-context.js';
import { maybeServeStatic, sendJson, sendText, toErrorPayload } from './lib/http.js';

export function createApp({ staticRoot }) {
  const context = createContext();

  return async function app(req, res) {
    try {
      const url = new URL(req.url, 'http://localhost');

      if (await maybeServeStatic(res, url.pathname, staticRoot)) {
        return;
      }

      if (req.method === 'GET' && url.pathname === '/health') {
        sendJson(res, 200, { ok: true });
        return;
      }

      if (await handleRoute({ req, res, url, context })) {
        return;
      }

      sendText(res, 404, 'Not found');
    } catch (error) {
      sendJson(res, error.statusCode || 500, toErrorPayload(error));
    }
  };
}
