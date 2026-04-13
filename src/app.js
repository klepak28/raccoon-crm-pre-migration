import { maybeServeStatic, sendJson, sendText, toErrorPayload } from './lib/http.js';

export function createApp({ staticRoot }) {
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

      sendText(res, 404, 'Not found');
    } catch (error) {
      sendJson(res, error.statusCode || 500, toErrorPayload(error));
    }
  };
}
