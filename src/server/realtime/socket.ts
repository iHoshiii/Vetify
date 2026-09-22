import type { Server as HttpServer } from 'node:http';

import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';

import { env } from '../config/env';
import { findThreadById, findUserById, isValidObjectId } from '../models';
import { notifyTyping } from '../services/messages.service';
import { setRealtime, userRoom } from './hub';

// Passes a live "typing" ping to the other party, but only from someone actually on the thread.
async function relayTyping(userId: string, payload: unknown): Promise<boolean> {
  const data = payload as { threadId?: unknown; typing?: unknown };
  if (typeof data?.threadId !== 'string' || !isValidObjectId(data.threadId)) return false;

  const [thread, sender] = await Promise.all([findThreadById(data.threadId), findUserById(userId)]);
  if (!thread || !sender) return false;

  const client = thread.client.toString();
  const professionalUser = thread.professionalUser.toString();
  if (userId !== client && userId !== professionalUser) return false;

  notifyTyping(thread, sender, Boolean(data.typing));
  return true;
}

// The access token, from the auth payload or the Authorization header, whichever the client sent.
function tokenOf(handshake: {
  auth?: { token?: unknown };
  headers: Record<string, unknown>;
}): string | null {
  const fromAuth = handshake.auth?.token;
  if (typeof fromAuth === 'string' && fromAuth) return fromAuth;

  const header = handshake.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/**
 * Attaches the socket server to the HTTP server and gates it on the access token.
 *
 * Same secret and same claim as the REST side, so a socket cannot be opened by an
 * account the API would refuse. An unverified token closes the connection rather
 * than joining it anonymous — a socket that proves nobody is nobody's to push to.
 */
export function attachRealtime(http: HttpServer): Server {
  const io = new Server(http, { path: '/socket.io', serveClient: false });

  io.use((socket, next) => {
    const token = tokenOf(socket.handshake);
    if (!token) return next(new Error('unauthorized'));

    try {
      const payload = jwt.verify(token, env.JWT_SECRET_ACCESS) as { sub?: string };
      if (!payload.sub) return next(new Error('unauthorized'));
      socket.data.userId = payload.sub;
      return next();
    } catch {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    void socket.join(userRoom(userId));
    socket.on(
      'thread:typing',
      (payload, acknowledge?: (result: { delivered: boolean }) => void) => {
        void relayTyping(userId, payload)
          .then((delivered) => acknowledge?.({ delivered }))
          .catch(() => acknowledge?.({ delivered: false }));
      }
    );
  });

  setRealtime(io);
  return io;
}
