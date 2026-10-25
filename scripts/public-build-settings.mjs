function cleanUrl(value, name, protocol, { originOnly = false } = {}) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a clean ${protocol.toUpperCase()} URL.`);
  }
  if (
    url.protocol !== `${protocol}:` ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (originOnly && url.pathname !== '/')
  ) {
    throw new Error(
      `${name} must be a clean ${protocol.toUpperCase()} URL without credentials, query parameters, or fragments.`
    );
  }
  return originOnly ? url.origin : value;
}

// Only these browser settings may enter a production website bundle.
export function publicBuildSettings(settings, environment = process.env) {
  const apiUrl = settings.VITE_API_URL?.trim() || '/api/v1';
  if (apiUrl !== '/api/v1') cleanUrl(apiUrl, 'VITE_API_URL', 'https');
  const realtimeUrl = settings.VITE_REALTIME_URL?.trim() || '';
  if (realtimeUrl) cleanUrl(realtimeUrl, 'VITE_REALTIME_URL', 'wss');
  const values = {
    VITE_API_URL: apiUrl,
    VITE_REALTIME_URL: realtimeUrl,
    // A dedicated public basemap key is intentionally visible in map requests.
    VITE_CARTO_KEY: environment.VITE_CARTO_KEY || settings.VITE_CARTO_KEY || '',
  };
  for (const name of ['VITE_BOOKS_ORIGIN', 'VITE_ANATOMY_ORIGIN', 'VITE_BLOGS_ORIGIN']) {
    const value = settings[name]?.trim() || '';
    values[name] = value ? cleanUrl(value, name, 'https', { originOnly: true }) : '';
  }
  return {
    // Disable implicit ambient VITE_* exposure and supply public values explicitly.
    envPrefix: [],
    define: Object.fromEntries(
      Object.entries(values).map(([name, value]) => [
        `import.meta.env.${name}`,
        JSON.stringify(value),
      ])
    ),
  };
}
