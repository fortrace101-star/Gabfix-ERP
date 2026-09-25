import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ensureDatabase } from './bootstrap-db';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { customersRouter } from './routes/customers';
import { equipmentRouter } from './routes/equipment';
import { expensesRouter } from './routes/expenses';
import { inventoryRouter } from './routes/inventory';
import { jobsRouter } from './routes/jobs';
import { servicesRouter } from './routes/services';
import { workspaceRouter } from './routes/workspace';
import { guard } from './middleware/auth';

const app = express();
app.use(cors());
app.use(express.json());

// Health stays unauthenticated (also exempted inside guard()).
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, database: process.env.PGDATABASE || 'gabfix' });
});

// Auth endpoints manage their own tokens (login/refresh are public, /me calls
// requireAuth), so they mount before the staged guard.
app.use('/api/auth', authRouter);

// Staged enforcement: a no-op until AUTH_ENFORCE=true, which Phase 0.10 flips
// once the login screen ships. Owner-only routes add guard('owner') on top.
app.use('/api', guard());

app.use('/api/data', workspaceRouter);
app.use('/api/customers', customersRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/equipment', equipmentRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/services', servicesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api', adminRouter); // POST /api/import, POST /api/reset

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

const port = Number(process.env.PORT) || 4000;

async function main() {
  // Make sure the database, its schema and demo data exist before serving.
  try {
    await ensureDatabase();
  } catch (error) {
    console.error('Database bootstrap failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Gabfix API listening on http://localhost:${port}`);
  });
}

void main();
