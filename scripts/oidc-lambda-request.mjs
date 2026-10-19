export function oidcLambdaRequester(handler, initialCookies) {
  const cookies = new Map();
  const remember = (entries = []) => {
    for (const entry of entries) {
      const pair = entry.split(';')[0];
      cookies.set(pair.slice(0, pair.indexOf('=')), pair);
    }
  };
  remember(initialCookies);
  return async (path, body) => {
    const url = new URL(path, 'https://vetify.page');
    const method = body === undefined ? 'GET' : 'POST';
    const response = await handler(
      {
        version: '2.0',
        routeKey: 'ANY /{proxy+}',
        rawPath: url.pathname,
        rawQueryString: url.search.slice(1),
        cookies: [...cookies.values()],
        headers: {
          host: 'api.test',
          origin: 'https://vetify.page',
          'content-type': 'application/x-www-form-urlencoded',
        },
        requestContext: {
          apiId: 'test',
          domainName: 'api.test',
          stage: '$default',
          requestId: 'oidc-smoke',
          timeEpoch: Date.now(),
          http: {
            method,
            path: url.pathname,
            sourceIp: '127.0.0.1',
            protocol: 'HTTP/1.1',
            userAgent: 'oidc-smoke',
          },
        },
        body: body === undefined ? undefined : new URLSearchParams(body).toString(),
        isBase64Encoded: false,
      },
      { callbackWaitsForEmptyEventLoop: true },
      () => undefined
    );
    remember(response.cookies);
    return response;
  };
}
