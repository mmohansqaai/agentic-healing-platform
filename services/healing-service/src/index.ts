import { startHealingServer } from './api/server';

const port = Number(process.env.HEALING_SERVICE_PORT || 3921);
startHealingServer(port);
