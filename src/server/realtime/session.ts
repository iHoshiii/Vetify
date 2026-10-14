import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import { env } from '../config/env';
import { activeSessionUser } from '../services/session-access.service';
import { requireVerifiedEmail } from '../services/email-verification-access';

export type SocketSession = { userId: string; sessionVersion: number; expiresAt: number };

export async function socketSession(token: string): Promise<SocketSession> {
  const payload = jwt.verify(token, env.JWT_SECRET_ACCESS);
  if (
    typeof payload === 'string' ||
    typeof payload.sub !== 'string' ||
    typeof payload.exp !== 'number'
  ) {
    throw new Error('unauthorized');
  }
  if (payload.nativeSessionId !== undefined) throw new Error('unauthorized');
  const sessionVersion = payload.sessionVersion ?? 0;
  if (!Number.isSafeInteger(sessionVersion) || sessionVersion < 0) throw new Error('unauthorized');
  requireVerifiedEmail(await activeSessionUser(payload.sub, sessionVersion));
  return { userId: payload.sub, sessionVersion, expiresAt: payload.exp * 1000 };
}

export async function checkSocketSession(socket: Socket): Promise<void> {
  const { userId, sessionVersion, expiresAt } = socket.data as SocketSession;
  if (Date.now() >= expiresAt) throw new Error('expired');
  await activeSessionUser(userId, sessionVersion);
}

export function endSocketSession(socket: Socket, reason = 'restricted'): void {
  socket.emit('session:ended', { reason });
  socket.disconnect(true);
}

export function guardSocket(socket: Socket): void {
  let remind: ReturnType<typeof setTimeout>;
  let expire: ReturnType<typeof setTimeout>;
  const clearTimers = () => {
    clearTimeout(remind);
    clearTimeout(expire);
  };
  const schedule = () => {
    clearTimers();
    const remaining = (socket.data.expiresAt as number) - Date.now();
    remind = setTimeout(() => socket.emit('session:renew-needed'), Math.max(0, remaining - 60_000));
    expire = setTimeout(() => endSocketSession(socket, 'expired'), Math.max(0, remaining));
    remind.unref();
    expire.unref();
  };
  const rejectSession = (cause: unknown) => {
    endSocketSession(
      socket,
      cause instanceof Error && cause.message === 'expired' ? 'expired' : 'restricted'
    );
  };
  socket.use(([event], next) => {
    if (event === 'session:renew') return next();
    void checkSocketSession(socket)
      .then(() => next())
      .catch((cause) => {
        rejectSession(cause);
        next(new Error('unauthorized'));
      });
  });
  socket.on('session:renew', (payload: unknown, ack?: (result: { ok: boolean }) => void) => {
    const token = (payload as { token?: unknown })?.token;
    if (typeof token !== 'string') {
      ack?.({ ok: false });
      return;
    }
    void socketSession(token)
      .then((session) => {
        if (!socket.connected || session.userId !== socket.data.userId) {
          ack?.({ ok: false });
          return;
        }
        if (session.sessionVersion < socket.data.sessionVersion) {
          ack?.({ ok: false });
          return;
        }
        if (session.sessionVersion === socket.data.sessionVersion) {
          session.expiresAt = Math.max(session.expiresAt, socket.data.expiresAt as number);
        }
        Object.assign(socket.data, session);
        schedule();
        ack?.({ ok: true });
      })
      .catch(() => ack?.({ ok: false }));
  });
  const verify = setInterval(() => {
    void checkSocketSession(socket).catch(rejectSession);
  }, 15_000);
  verify.unref();
  socket.on('disconnect', () => {
    clearTimers();
    clearInterval(verify);
  });
  schedule();
}
