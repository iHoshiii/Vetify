import { z } from 'zod';

// Production uses injected values or Node's explicit --env-file, without local fallback.
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  try {
    process.loadEnvFile();
  } catch {
    // Local .env is optional when the shell already supplies configuration.
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  REALTIME_MANAGEMENT_ENDPOINT: z.string().url().optional(),

  MONGODB_URI: z.string().min(1).default('mongodb://localhost:27017/vetify'),

  // Comma-separated resolvers for Node's SRV/TXT lookups. Only needed on
  // machines where Node cannot read the nameservers itself and falls back to
  // 127.0.0.1, which strands every mongodb+srv:// connection. See config/dns.ts.
  DNS_SERVERS: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(',')
            .map((server) => server.trim())
            .filter(Boolean)
        : []
    ),

  // Only consulted for non-proxied clients. The Vite dev proxy keeps the
  // browser same-origin, so CORS is a no-op in normal local development.
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),

  BEDROCK_REGION: z.string().min(1).default('ap-southeast-2'),

  JWT_SECRET_ACCESS: z.string().min(32, 'JWT_SECRET must be set and at least 32 characters'),
  ACCESS_TOKEN_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
  REFRESH_COOKIE_NAME: z.string().default('refresh_token'),

  // Public origin of this API. Provider redirect URIs are derived from it, so it
  // has to match what each provider console has registered, character for
  // character.
  SERVER_URL: z.string().url().default('http://localhost:8000'),

  // Where the OAuth callback sends the browser once it is done. Success lands on
  // a client route that trades the refresh cookie for an access token.
  OAUTH_SUCCESS_REDIRECT: z.string().url().default('http://localhost:5173/auth/callback'),
  OAUTH_FAILURE_REDIRECT: z.string().url().default('http://localhost:5173/login?error=oauth'),

  // Signs the state cookie binding an authorize request to its callback. Every
  // provider credential below is optional: a provider with no keys is simply
  // reported as unconfigured instead of taking the whole process down at boot.
  OAUTH_STATE_SECRET: z.string().min(32).optional(),

  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

  FACEBOOK_APP_ID: z.string().min(1).optional(),
  FACEBOOK_APP_SECRET: z.string().min(1).optional(),

  TIKTOK_CLIENT_KEY: z.string().min(1).optional(),
  TIKTOK_CLIENT_SECRET: z.string().min(1).optional(),

  // ---- Transactional mail ----
  // `log` writes the message to the server log instead of sending it, which is
  // what local development wants: the invite link is right there in the terminal
  // and no real address receives anything. `http` posts to a provider speaking
  // Resend's JSON shape. Nothing else is wired, on purpose — a second transport
  // is a second thing to get wrong on the one path that carries invite links.
  MAIL_TRANSPORT: z.enum(['log', 'http']).default('log'),

  // The From header. Providers refuse anything on a domain they have not
  // verified, so this default is only good for `log`.
  MAIL_FROM: z.string().min(1).default('Vetify <no-reply@vetify.local>'),

  // Endpoint and key for the `http` transport. Optional in the same spirit as
  // the OAuth credentials: a missing key is reported when a message is actually
  // sent, so a developer who never mails anything is not stopped at boot.
  MAIL_API_URL: z.string().url().default('https://api.resend.com/emails'),
  MAIL_API_KEY: z.string().min(1).optional(),

  // Authentication emails require their own API key, separate from professional mail.
  AUTH_MAIL_TRANSPORT: z.enum(['log', 'http']).default('http'),
  AUTH_MAIL_API_URL: z.string().url().optional(),
  AUTH_MAIL_FROM: z.string().min(1).optional(),
  AUTH_MAIL_API_KEY: z.string().min(1).optional(),

  // ---- In-app video call ----
  // Optional TURN relay for calls that cannot hole-punch. All three go together;
  // with none set the call falls back to Google STUN alone, which is enough on most networks.
  TURN_URL: z.string().min(1).optional(),
  TURN_USERNAME: z.string().min(1).optional(),
  TURN_CREDENTIAL: z.string().min(1).optional(),
});

/**
 * A var left blank counts as unset.
 *
 * `KEY=` is what a copied sample looks like before anybody fills it in, and it is
 * what an unset var looks like in most deployment consoles. Zod reads '' as a
 * value that is present and then refuses it, which turns an unconfigured optional
 * secret into a boot failure — the whole server down over a credential nothing had
 * asked for yet. Dropping the empty ones lets every default and every .optional()
 * below mean what it says.
 */
const provided = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== undefined && value.trim() !== '')
);

const parsed = envSchema.safeParse(provided);

if (!parsed.success) {
  const details = Object.entries(parsed.error.flatten().fieldErrors)
    .map(([key, errors]) => `  ${key}: ${errors?.join(', ')}`)
    .join('\n');
  // Fail at boot rather than at the first request that needs the value.
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
