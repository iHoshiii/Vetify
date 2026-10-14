import { createServer, type Server as HttpServer } from 'node:http';
import { io as connect, type Socket as ClientSocket } from 'socket.io-client';
import type { Server } from 'socket.io';
import { insertAppointment, updateAppointment } from '../../models/appointments';
import { insertUser, type User } from '../../models/users';
import { signAccessToken } from '../../services/auth.service';
import { ObjectId } from 'mongodb';
import { attachRealtime } from '../socket';

let http: HttpServer;
let realtime: Server;
let address: string;
const clients: ClientSocket[] = [];

export async function startSockets(): Promise<void> {
  http = createServer();
  realtime = attachRealtime(http);
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  address = `http://127.0.0.1:${(http.address() as { port: number }).port}`;
}

export async function stopSockets(): Promise<void> {
  clients.splice(0).forEach((socket) => socket.disconnect());
  await new Promise<void>((resolve) => realtime.close(() => resolve()));
}

export function tokenFor(user: User): string {
  return signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion ?? 0,
  });
}

export function openSocket(token: string): ClientSocket {
  const socket = connect(address, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
  });
  clients.push(socket);
  return socket;
}

export function serverSocket(client: ClientSocket) {
  return realtime.sockets.sockets.get(client.id!)!;
}

export function event<T>(socket: ClientSocket, name: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(name, onEvent);
      reject(new Error(`Missing ${name}`));
    }, 5_000);
    const onEvent = (data: T) => {
      clearTimeout(timeout);
      resolve(data);
    };
    socket.once(name, onEvent);
  });
}

export async function connected(user: User): Promise<ClientSocket> {
  const socket = openSocket(tokenFor(user));
  await event(socket, 'connect');
  return socket;
}

export function emitAck<T>(socket: ClientSocket, name: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    socket
      .timeout(5_000)
      .emit(name, payload, (error: Error | null, result: T) =>
        error ? reject(error) : resolve(result)
      );
  });
}

export async function callBooking() {
  const owner = await insertUser({ email: 'owner@test.invalid', provider: 'google' });
  const vet = await insertUser({
    email: 'vet@test.invalid',
    provider: 'google',
    role: 'professional',
  });
  const startsAt = new Date(Date.now() + 5 * 60_000);
  const booking = await insertAppointment({
    client: owner._id,
    professionalUser: vet._id,
    professional: new ObjectId(),
    kind: 'virtual',
    startsAt,
    minutes: 30,
    heldSlots: [startsAt],
    petSpecies: 'dog',
    reason: 'Check',
  });
  await updateAppointment(booking._id, { status: 'confirmed' });
  return { owner, vet, id: booking._id.toString() };
}
