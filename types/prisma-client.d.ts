declare module "@prisma/client" {
  // Minimal ambient declarations to satisfy the editor when @prisma/client
  // isn't installed. Replace with the real generated types by installing
  // the package and running `prisma generate`.

  export class PrismaClient {
    constructor(options?: any);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    // Allow any model access for now; domain code should use generated types.
    [key: string]: any;
  }

  export const Prisma: any;

  export type Json = any;
}
