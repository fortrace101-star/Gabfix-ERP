import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db';
import { requireAuth, signTokens, verifyToken, type AuthUser } from '../middleware/auth';

export const authRouter = Router();

const fail = (res: import('express').Response, error: unknown, fallback: string) => {
  console.error('[auth]', error);
  res.status(500).json({ error: fallback });
};

/** POST /api/auth/login — identifier is an employee name or email. */
authRouter.post('/login', async (req, res) => {
  try {
    const body = (req.body ?? {}) as { identifier?: unknown; email?: unknown; password?: unknown };
    const identifier = String(body.identifier ?? body.email ?? '').trim();
    const password = typeof body.password === 'string' ? body.password : '';
    if (!identifier || !password) {
      res.status(422).json({ error: 'identifier and password are required' });
      return;
    }

    const { rows } = await pool.query(
      `SELECT id, name, role, pin_hash, active FROM employees
       WHERE deleted_at IS NULL AND active
         AND (lower(name) = lower($1) OR (email <> '' AND lower(email) = lower($1)))
       LIMIT 1`,
      [identifier],
    );
    const employee = rows[0];
    if (!employee?.pin_hash || !(await bcrypt.compare(password, employee.pin_hash))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user: AuthUser = { id: employee.id, name: employee.name, role: employee.role };
    res.json({ ...signTokens(user), user });
  } catch (error) {
    fail(res, error, 'Login failed');
  }
});

/** POST /api/auth/refresh — exchanges a refresh token for a fresh pair. */
authRouter.post('/refresh', async (req, res) => {
  try {
    const token = typeof (req.body ?? {}).refreshToken === 'string' ? req.body.refreshToken : '';
    const candidate = token ? verifyToken(token, 'refresh') : null;
    if (!candidate) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const { rows } = await pool.query(
      `SELECT id, name, role, active FROM employees WHERE id = $1 AND deleted_at IS NULL`,
      [candidate.id],
    );
    const employee = rows[0];
    if (!employee?.active) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const user: AuthUser = { id: employee.id, name: employee.name, role: employee.role };
    res.json({ ...signTokens(user), user });
  } catch (error) {
    fail(res, error, 'Refresh failed');
  }
});

/** GET /api/auth/me — the signed-in employee, read fresh from the database. */
authRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, role, phone, email FROM employees
       WHERE id = $1 AND deleted_at IS NULL AND active`,
      [req.user?.id],
    );
    if (!rows[0]) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    res.json({ user: rows[0] });
  } catch (error) {
    fail(res, error, 'Lookup failed');
  }
});

/** POST /api/auth/logout — stateless tokens; the client discards its pair. */
authRouter.post('/logout', (_req, res) => {
  res.json({ ok: true });
});