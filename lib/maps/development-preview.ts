export function isDevelopmentMapPreviewAvailable(
  environment = process.env.NODE_ENV,
): boolean {
  return environment === 'development';
}
