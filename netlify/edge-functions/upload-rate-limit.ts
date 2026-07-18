export default function uploadRateLimit() {
  return undefined;
}

export const config = {
  path: '/api/upload/timeline-card/*',
  method: 'POST',
  rateLimit: {
    windowLimit: 20,
    windowSize: 60,
    aggregateBy: ['ip', 'domain']
  }
};
