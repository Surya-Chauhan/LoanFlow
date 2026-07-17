import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import connectDB from './config/database';

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log('\nLMS Backend Server Started');
      console.log(` Port:     ${PORT}`);
      console.log(` API:      http://localhost:${PORT}/api`);
      console.log(`  Health:   http://localhost:${PORT}/health\n`);
    });
  } catch (error) {
    console.error(' Server failed to start:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

startServer();
