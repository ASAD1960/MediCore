import { app } from './app';
import { env } from './config/environment';
import { prisma } from './config/database';

const server = app.listen(env.PORT, () => console.log(`MediCore API listening on :${env.PORT}`));
const shutdown = async () => { server.close(); await prisma.$disconnect(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
