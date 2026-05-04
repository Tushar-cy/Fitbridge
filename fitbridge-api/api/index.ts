import { createApp } from '../src/app';

// Vercel Serverless Function entry point
// We bypass Redis/Socket.IO and export the pure Express app
const app = createApp();

export default app;
