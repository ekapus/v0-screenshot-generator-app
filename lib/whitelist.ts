/**
 * Whitelist utility for validating domains
 */

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
  // If no domains are whitelisted, log a warning and reject
  if (WHITELISTED_DOMAINS.length === 0) {
    console.error('[Screenshot] WHITELISTED_DOMAINS environment variable not set. Please configure it in your Vercel project settings.');
    console.error('[Screenshot] Set WHITELISTED_DOMAINS to a comma-separated list of allowed domains (e.g., "example.com,github.com,*.vercel.app")');
    return false;
  }

  try {
    const url = new URL(urlString);
    const hostname = url.hostname;
    
    return WHITELISTED_DOMAINS.some(domain => {
      // Support both exact matches and wildcard subdomains
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

export function getWhitelistedDomains(): string[] {
  return WHITELISTED_DOMAINS;
}
