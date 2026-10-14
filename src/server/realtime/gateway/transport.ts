import {
  ApiGatewayManagementApiClient,
  DeleteConnectionCommand,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';

export type GatewayTransport = {
  send(id: string, data: unknown): Promise<boolean>;
  close(id: string): Promise<void>;
};
let transport: GatewayTransport | undefined;

export function configureGatewayTransport(endpoint: string): void {
  const client = new ApiGatewayManagementApiClient({ endpoint, maxAttempts: 2 });
  transport = {
    async send(id, data) {
      try {
        await client.send(
          new PostToConnectionCommand({ ConnectionId: id, Data: Buffer.from(JSON.stringify(data)) })
        );
        return true;
      } catch (error) {
        if (
          (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 410
        )
          return false;
        throw error;
      }
    },
    async close(id) {
      try {
        await client.send(new DeleteConnectionCommand({ ConnectionId: id }));
      } catch (error) {
        if (
          (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 410
        )
          throw error;
      }
    },
  };
}
export function setGatewayTransport(value: GatewayTransport): void {
  transport = value;
}
export function gatewayTransport(): GatewayTransport {
  if (!transport) throw new Error('Realtime gateway transport is not configured');
  return transport;
}
