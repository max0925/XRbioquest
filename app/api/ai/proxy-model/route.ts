import { NextRequest } from 'next/server';
import { proxyPublicAsset } from '@/lib/api/public-proxy';

export const runtime = 'nodejs';
export const maxDuration = 30;

const ALLOWED_HOSTS = [
  'assets.meshy.ai',
  'api.meshy.ai',
  'meshy.ai',
  'storage.googleapis.com',
  'storage.cloud.google.com',
  'blockadelabs.com',
  'backend.blockadelabs.com',
  'cdn.blockadelabs.com',
  'blockadelabs-skybox-uploads.s3.amazonaws.com',
  'blockadelabs-skybox.s3.amazonaws.com',
  's3.amazonaws.com',
  's3.us-west-2.amazonaws.com',
  's3.us-east-1.amazonaws.com',
  'd1a370nemizbjq.cloudfront.net',
] as const;

export function GET(request: NextRequest) {
  return proxyPublicAsset(request, ALLOWED_HOSTS);
}

export function HEAD(request: NextRequest) {
  return proxyPublicAsset(request, ALLOWED_HOSTS);
}
