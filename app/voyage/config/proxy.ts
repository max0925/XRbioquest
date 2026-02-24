// CORS PROXY - Wrap external URLs to load AI-generated assets
const PROXY_DOMAINS = ['assets.meshy.ai', 'api.meshy.ai', 'meshy.ai', 'blockadelabs', 's3.amazonaws.com', 'storage.googleapis.com', 'cloudfront.net'];

export function shouldProxy(url: string | null | undefined): boolean {
    if (!url) return false;
    return PROXY_DOMAINS.some(domain => url.includes(domain));
}

export function proxyUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    if (shouldProxy(url)) {
        return `/api/proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
}
