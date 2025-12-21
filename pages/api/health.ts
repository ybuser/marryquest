import type { NextApiRequest, NextApiResponse } from 'next';

import { withRateLimit } from '@/lib/security/rateLimit';

const handler = async (_req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).json({ status: 'ok' });
};

export default withRateLimit(handler, { intervalMs: 60_000, max: 60 });
