import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw httpError(400, 'INVALID_JSON', 'Request body must be valid JSON');
  }
}

export function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

export function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}

export function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(text);
}

export function matchRoute(method, pathname, pattern) {
  const routeParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  if (method == null || routeParts.length !== pathParts.length) return null;

  const params = {};
  for (let index = 0; index < routeParts.length; index += 1) {
    const routePart = routeParts[index];
    const pathPart = pathParts[index];
    if (routePart.startsWith(':')) {
      params[routePart.slice(1)] = decodeURIComponent(pathPart);
      continue;
    }
    if (routePart !== pathPart) return null;
  }

  return params;
}

export function httpError(statusCode, code, message, details = undefined) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

export function toErrorPayload(error) {
  return {
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Unexpected error',
      details: error.details,
    },
  };
}

export async function maybeServeStatic(res, pathname, staticRoot) {
  if (!pathname.startsWith('/static/')) return false;
  const relativePath = pathname.replace('/static/', '');
  const filePath = path.join(staticRoot, relativePath);
  const content = await readFile(filePath);
  const contentType = filePath.endsWith('.js')
    ? 'text/javascript; charset=utf-8'
    : filePath.endsWith('.css')
      ? 'text/css; charset=utf-8'
      : 'text/plain; charset=utf-8';
  res.writeHead(200, { 'content-type': contentType });
  res.end(content);
  return true;
}
