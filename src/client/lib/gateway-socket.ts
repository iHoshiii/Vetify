import { API_BASE_URL } from '@/services/api';
import { GatewayEvents } from './gateway-events';
import { renewalDelay } from './gateway-auth';

type Ack = (...args: unknown[]) => void;

export class GatewaySocket extends GatewayEvents {
  connected = false;
  auth: { token: string };
  private ws: WebSocket | null = null;
  private wanted = false;
  private generation = 0;
  private attempts = 0;
  private retry?: ReturnType<typeof setTimeout>;
  private heartbeat?: ReturnType<typeof setInterval>;
  private renewal?: ReturnType<typeof setTimeout>;
  private clientId = crypto.randomUUID();
  constructor(private endpoint: string, token: string) {
    super();
    this.auth = { token };
  }
  connect(): this {
    if (this.wanted && (this.ws || this.retry)) return this;
    this.wanted = true;
    void this.open(++this.generation);
    return this;
  }
  disconnect(): this {
    this.wanted = false;
    this.generation++;
    clearTimeout(this.retry);
    this.retry = undefined;
    this.clearQueue();
    this.ws?.close();
    this.ws = null;
    this.closed();
    return this;
  }
  emit(event: string, payload: unknown, callback?: (value: unknown) => void): this {
    if (!this.connected) {
      this.queueEvent(
        event,
        payload,
        callback ? (error, value) => callback(error ? { ok: false } : value) : undefined
      );
      return this;
    }
    this.send(
      event,
      payload,
      callback ? (error, value) => callback(error ? { ok: false } : value) : undefined
    );
    return this;
  }
  timeout(milliseconds: number) {
    return {
      emit: (event: string, payload: unknown, callback: Ack) => {
        if (!this.connected) {
          callback(new Error('Realtime disconnected'));
          return this;
        }
        this.send(event, payload, callback, milliseconds);
        return this;
      },
    };
  }
  private send(event: string, payload: unknown, callback?: Ack, timeout?: number): void {
    this.request(event, payload, (data) => this.ws?.send(data), callback, timeout);
    if (event === 'session:renew') this.scheduleRenewal();
  }
  private scheduleRenewal(): void {
    clearTimeout(this.renewal);
    this.renewal = setTimeout(
      () => this.dispatch('session:renew-needed'),
      renewalDelay(this.auth.token)
    );
  }
  private async open(generation: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/account/realtime-ticket`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${this.auth.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: this.clientId }),
      });
      if (!this.wanted || generation !== this.generation) return;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.wanted = false;
          this.dispatch('session:ended', {
            reason: response.status === 401 ? 'expired' : 'restricted',
          });
          return;
        }
        throw new Error('Unable to open realtime connection');
      }
      const { ticket } = (await response.json()) as { ticket: string };
      if (!this.wanted || generation !== this.generation) return;
      const url = new URL(this.endpoint);
      url.searchParams.set('ticket', ticket);
      const ws = new WebSocket(url);
      this.ws = ws;
      ws.onmessage = (message) => {
        if (this.ws === ws) this.receive(String(message.data));
      };
      ws.onopen = () => {
        if (this.ws !== ws) return;
        this.request(
          'connection:ready',
          {},
          (data) => ws.send(data),
          (error, value) => {
            if (error || !(value as { ok?: boolean })?.ok || this.ws !== ws) {
              ws.close();
              return;
            }
            this.connected = true;
            this.attempts = 0;
            this.scheduleRenewal();
            this.heartbeat = setInterval(() => this.send('connection:heartbeat', {}), 25_000);
            this.flushQueue((event, payload, callback) => this.send(event, payload, callback));
            this.dispatch('connect');
          }
        );
      };
      ws.onerror = () => this.dispatch('connect_error', new Error('Realtime connection failed'));
      ws.onclose = () => {
        if (this.ws !== ws) return;
        this.ws = null;
        this.closed();
        this.reconnect();
      };
    } catch {
      if (generation === this.generation) this.reconnect();
    }
  }
  private closed(): void {
    const wasConnected = this.connected;
    this.connected = false;
    clearInterval(this.heartbeat);
    clearTimeout(this.renewal);
    this.cancelRequests();
    if (wasConnected) this.dispatch('disconnect');
  }
  private reconnect(): void {
    if (!this.wanted || this.retry) return;
    this.retry = setTimeout(() => {
      this.retry = undefined;
      void this.open(++this.generation);
    }, Math.min(30_000, 1000 * 2 ** Math.min(5, this.attempts++)) + Math.random() * 300);
  }
}
