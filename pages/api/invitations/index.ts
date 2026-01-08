import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { requireApiAuth } from '@/lib/auth';
import { withRateLimit } from '@/lib/security/rateLimit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await requireApiAuth(req, res);
  if (!session?.user?.id) return;

  if (req.method === 'GET') {
    const invitations = await prisma.invitation.findMany({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json(invitations);
  }

  if (req.method === 'POST') {
    const now = new Date();
    const slug = `inv-${now.getTime().toString(36)}`;

    const invitation = await prisma.invitation.create({
      data: {
        userId: session.user.id,
        slug,
        status: 'draft',
        templateKey: 'mono',
        title: 'New Invitation',
        groomName: 'Groom',
        brideName: 'Bride',
        dateTime: now,
        venueName: 'Venue',
        address: 'TBD'
      }
    });

    return res.status(200).json(invitation);
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).end('Method Not Allowed');
}

export default withRateLimit(handler, { windowMs: 60_000, max: 30 });
