import type { NextApiRequest, NextApiResponse } from 'next';
import { withRateLimit } from '../../lib/security/rateLimit';

const handler = (req: NextApiRequest, res: NextApiResponse) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
};

export default withRateLimit(handler, { windowMs: 60_000, max: 60 });
