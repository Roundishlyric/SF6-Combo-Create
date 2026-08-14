const deploymentUrl = process.env.DEPLOYMENT_URL;
if (!deploymentUrl) throw new Error('DEPLOYMENT_URL is required, for example https://hadoukraft.vercel.app');

const endpoint = new URL('/api/health', deploymentUrl);
const response = await fetch(endpoint, { signal: AbortSignal.timeout(10_000) });
const body = await response.json().catch(() => ({}));
if (!response.ok || body.status !== 'ok' || body.database !== 'connected') {
  throw new Error(`Health check failed (${response.status}): ${JSON.stringify(body)}`);
}
console.log(`Healthy: ${endpoint}`);
