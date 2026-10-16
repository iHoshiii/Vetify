import { GatewayEvents } from './gateway-events';
import { renewalDelay } from './gateway-auth';
import { fetchGatewayTicket, gatewayAttempt, GatewayTicketError } from './gateway-ticket';

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
  private attempt?: ReturnType<typeof gatewayAttempt>;
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
    this.attempt?.cancel();
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
  timeout(milliseconds: number): {
    emit: (event: string, payload: unknown, callback: Ack) => GatewaySocket;
  } {
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
    this.attempt?.cancel();
    const attempt = gatewayAttempt(() => {
      if (!this.wanted || generation !== this.generation) return;
      const retryGeneration = ++this.generation;
      const ws = this.ws;
      this.ws = null;
      ws?.close();
      this.closed();
      if (retryGeneration === this.generation) this.reconnect();
    });
    this.attempt = attempt;
    try {
      const ticket = await fetchGatewayTicket(this.auth.token, this.clientId, attempt.signal);
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
            attempt.finish();
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
        attempt.cancel();
        this.closed();
        if (generation === this.generation) this.reconnect();
      };
    } catch (error) {
      attempt.cancel();
      if (!this.wanted || generation !== this.generation) return;
      if (error instanceof GatewayTicketError && [401, 403].includes(error.status)) {
        this.wanted = false;
        this.dispatch('session:ended', { reason: error.status === 401 ? 'expired' : 'restricted' });
      } else this.reconnect();
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
    if (!this.wanted || this.retry || this.ws) return;
    const generation = this.generation;
    this.retry = setTimeout(() => {
      this.retry = undefined;
      if (!this.wanted || this.ws || generation !== this.generation) return;
      void this.open(++this.generation);
    }, Math.min(30_000, 1000 * 2 ** Math.min(5, this.attempts++)) + Math.random() * 300);
  }
}
