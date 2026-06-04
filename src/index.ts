import { worker } from '@src/wokers';

const initServer = async () => {
  await worker();
};

initServer()
  .then(() => {
    console.log('Server is running');
  })
  .catch((error) => {
    console.error('Error initializing server:', error);
  });
