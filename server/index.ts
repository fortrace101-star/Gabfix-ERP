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
import { paymentsRouter } from './routes/payments';
import { costingRouter } from './routes/costing';
import { servicesRouter } from './routes/services';
import { eventsRouter } from './routes/events';
import { workspaceRouter } from './routes/workspace';
import { guard, requireScope } from './middleware/auth';

// Multi-app CORS (multi-app-plan §10.3): the four Vercel apps plus local dev
// ports 5173–5179. Vite serves on IPv6 localhost in dev, hence the ::1 forms.
const ALLOWED_ORIGINS = [
  'https://gabfix-administrator.vercel.app',
  'https://gabfix-laundry-front-office.vercel.app',
  'https://gabfix-inhouse-erp.vercel.app',
  'https://gabfix-store.vercel.app',
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:5174', 'http://127.0.0.1:5174',
  'http://localhost:5175', 'http://127.0.0.1:5175',
  'http://localhost:5176', 'http://127.0.0.1:5176',
  'http://localhost:5177', 'http://localhost:5178', 'http://localhost:5179',
];

const app = express();
app.use(cors({
  origin(origin, callback) {
    // No Origin (curl, same-origin) or an allowlisted origin passes.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // Dev override for preview servers etc., documented in .env.example.
    if (process.env.CORS_ALLOW_ALL === 'true') return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
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

// Scoped mounts (multi-app-plan §10.4): each mount carries the app_scope set
// that may use it. Scope checks arm when AUTH_ENFORCE=true — mirroring guard(),
// they stay pass-through in the default dev posture.
const scoped = requireScope;

app.use('/api/data', scoped('admin', 'laundry', 'portal', 'store'), workspaceRouter);
app.use('/api/customers', scoped('admin', 'laundry', 'portal', 'store'), customersRouter);
app.use('/api/jobs', scoped('admin', 'portal', 'laundry'), jobsRouter);
app.use('/api/payments', scoped('admin', 'laundry', 'store', 'portal'), paymentsRouter);
app.use('/api', scoped('admin', 'portal'), costingRouter); // /costs, /timesheets (Phase 1c)
app.use('/api/equipment', scoped('admin', 'laundry'), equipmentRouter);
app.use('/api/expenses', scoped('admin', 'laundry', 'store', 'portal'), expensesRouter);
app.use('/api/services', scoped('admin', 'laundry', 'store', 'portal'), servicesRouter);
app.use('/api/inventory', scoped('admin', 'laundry', 'store'), inventoryRouter);
app.use('/api/events', eventsRouter); // SSE stream (Phase 0.11)
app.use('/api', adminRouter); // POST /api/import, POST /api/reset (owner-only inside)

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

const port = Number(process.env.PORT) || 5000;

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
