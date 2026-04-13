import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = createApp({
  staticRoot: path.join(__dirname, 'ui', 'static'),
});

const port = process.env.PORT || 3000;

http.createServer(app).listen(port, () => {
  console.log(`CRM V1 slice listening on http://localhost:${port}`);
});
