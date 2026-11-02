import 'dotenv/config';

import { loadConfig } from '@src/config/env';
import { startApplication } from '@src/workers';

const application = startApplication(loadConfig());

let isShuttingDown = false;

const handleApplicationShutdownSignal = (signal: NodeJS.Signals): void => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.info(`${signal} received, shutting down...`);

  application
    .shutdown()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error during shutdown:', error);
      process.exit(1);
    });
};

process.on('SIGTERM', handleApplicationShutdownSignal);
process.on('SIGINT', handleApplicationShutdownSignal);

application.workerDone?.catch((error) => {
  console.error('Email worker stopped unexpectedly:', error);
  process.exit(1);
});
