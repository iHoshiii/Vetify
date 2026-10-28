import type { Configuration } from 'oidc-provider';
import { ANATOMY_CLIENT_ID, BOOKS_CLIENT_ID, BLOG_CLIENT_ID, type OidcSettings } from './settings';

export function sharedAuthClients(settings: OidcSettings): NonNullable<Configuration['clients']> {
  const registrations = [
    { id: ANATOMY_CLIENT_ID, secret: settings.clientSecret, callback: settings.callback },
    ...(settings.blogClientSecret
      ? [{ id: BLOG_CLIENT_ID, secret: settings.blogClientSecret, callback: settings.blogCallback }]
      : []),
    ...(settings.booksClientSecret
      ? [
          {
            id: BOOKS_CLIENT_ID,
            secret: settings.booksClientSecret,
            callback: settings.booksCallback,
          },
        ]
      : []),
  ];
  return registrations.map(({ id, secret, callback }) => ({
    client_id: id,
    client_secret: secret,
    redirect_uris: [callback],
    response_types: ['code'],
    grant_types: ['authorization_code'],
    token_endpoint_auth_method: 'client_secret_post',
    id_token_signed_response_alg: 'RS256',
  }));
}

export function isSharedAuthClient(id: unknown) {
  return id === ANATOMY_CLIENT_ID || id === BOOKS_CLIENT_ID || id === BLOG_CLIENT_ID;
}
