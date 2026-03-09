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
  if (WHITELISTED_DOMAINS.length === 0) {
    console.warn('[Screenshot] No whitelisted domains configured');
    return false;
  }

  try {
    const url = new URL(urlString);
    const hostname = url.hostname;
    
    return WHITELISTED_DOMAINS.some(domain => {
      // Support both exact matches and wildcard subdomains
      if (domain.startsWith('*.')) {
        const baseomain = domain.slice(2);
        return hostname === baseomain || hostname.endsWith('.' + baseomain);
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
