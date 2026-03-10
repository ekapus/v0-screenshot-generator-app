const WHITELISTED_DOMAINS = (process.env.WHITELISTED_DOMAINS || '').split(',').map(d => d.trim()).filter(Boolean);

export function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

export function isWhitelistedDomain(urlString: string): boolean {
  if (WHITELISTED_DOMAINS.length === 0) {
    console.error('[Screenshot] WHITELISTED_DOMAINS not configured. Set it in your Vercel project settings.');
    return false;
  }

  try {
    const url = new URL(urlString);
    const hostname = url.hostname;
    
    return WHITELISTED_DOMAINS.some(domain => {
      if (domain.startsWith('*.')) {
        const baseDomain = domain.slice(2);
        return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
      }
      return hostname === domain;
    });
  } catch {
    return false;
  }
}
