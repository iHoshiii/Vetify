type Listener = (...args: unknown[]) => void;
type Pending = { callback: Listener; timer: ReturnType<typeof setTimeout> };

export class GatewayEvents {
  private queued: { event: string; payload: unknown; callback?: Listener }[] = [];
  private listeners = new Map<string, Set<Listener>>();
  private pending = new Map<string, Pending>();
  private sequence = 0;
  on<T>(event: string, listener: (payload: T) => void): this {
    const listeners = this.listeners.get(event) ?? new Set<Listener>();
    listeners.add(listener as Listener);
    this.listeners.set(event, listeners);
    return this;
  }
  off<T>(event: string, listener: (payload: T) => void): this {
    this.listeners.get(event)?.delete(listener as Listener);
    return this;
  }
  protected dispatch(event: string, payload?: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) listener(payload);
  }
  protected receive(data: string): void {
    let message: { event?: string; payload?: unknown; requestId?: string; error?: string };
    try {
      message = JSON.parse(data);
    } catch {
      return;
    }
    if (message.requestId) {
      const request = this.pending.get(message.requestId);
      if (!request) return;
      clearTimeout(request.timer);
      this.pending.delete(message.requestId);
      request.callback(message.error ? new Error(message.error) : null, message.payload);
    } else if (typeof message.event === 'string') this.dispatch(message.event, message.payload);
  }
  protected request(
    event: string,
    payload: unknown,
    send: (data: string) => void,
    callback?: Listener,
    timeout = 10_000
  ): void {
    const requestId = callback ? String(++this.sequence) : undefined;
    if (requestId && callback) {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        callback(new Error('Realtime acknowledgement timed out'));
      }, timeout);
      this.pending.set(requestId, { callback, timer });
    }
    send(JSON.stringify({ event, payload, requestId }));
  }
  protected cancelRequests(): void {
    const requests = [...this.pending.values()];
    this.pending.clear();
    for (const request of requests) {
      clearTimeout(request.timer);
      request.callback(new Error('Realtime connection closed'));
    }
  }
  protected queueEvent(event: string, payload: unknown, callback?: Listener): void {
    if (event === 'call:leave')
      this.queued = this.queued.filter(
        (item) =>
          (item.payload as { appointmentId?: string })?.appointmentId !==
          (payload as { appointmentId?: string })?.appointmentId
      );
    if (event === 'call:join' && this.queued.length < 10)
      this.queued.push({ event, payload, callback });
  }
  protected clearQueue(): void {
    this.queued = [];
  }
  protected flushQueue(send: (event: string, payload: unknown, callback?: Listener) => void): void {
    for (const item of this.queued.splice(0)) send(item.event, item.payload, item.callback);
  }
}
