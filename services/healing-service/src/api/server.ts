import express from 'express';
import { postHeal } from './heal-route';

export function createHealingServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'healing-service', version: '0.1.0' });
  });

  app.post('/heal', postHeal);

  return app;
}

export function startHealingServer(port = Number(process.env.HEALING_SERVICE_PORT || 3921)) {
  const app = createHealingServer();
  return app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.info(`[healing-service] listening on http://localhost:${port}`);
  });
}
