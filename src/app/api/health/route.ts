/**
 * Liveness probe for uptime checks and post-deploy verification.
 * Returns no configuration or credential detail by design.
 */
export function GET() {
  return Response.json({
    status: 'ok',
    service: 'formivo',
    timestamp: new Date().toISOString(),
  });
}