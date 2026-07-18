import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';
import { verifyAdminPassphrase } from '@/lib/security/adminPassphrase';
import { isConfiguredServerSecret } from '@/lib/security/configValue';
import { loadOwnerConfig } from '@/lib/security/ownerAuth';
import { createStorageProvider } from '@/lib/storage';

function hasValidNextAuthUrl(value: string | undefined): boolean {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      !parsed.hostname ||
      parsed.username.length > 0 ||
      parsed.password.length > 0
    ) {
      return false;
    }

    return process.env.NODE_ENV !== 'production' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function hasValidSecurityConfiguration(): boolean {
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  const quizBadgeSecret = process.env.QUIZ_BADGE_SECRET;
  const adminPassphrase = process.env.ADMIN_PASSPHRASE;
  const secrets = [nextAuthSecret, quizBadgeSecret, adminPassphrase];
  const secretsAreLongEnough = secrets.every((secret) => isConfiguredServerSecret(secret));
  const secretsAreDistinct = secretsAreLongEnough && new Set(secrets).size === secrets.length;

  return (
    secretsAreLongEnough &&
    secretsAreDistinct &&
    hasValidNextAuthUrl(process.env.NEXTAUTH_URL) &&
    loadOwnerConfig().success
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ status: 'not_ready' });
  }

  if (!verifyAdminPassphrase(req.headers['x-admin-passphrase'])) {
    return res.status(401).json({ status: 'not_ready' });
  }

  if (!hasValidSecurityConfiguration()) {
    console.error('[ready] READINESS_CONFIGURATION_INVALID');
    return res.status(503).json({ status: 'not_ready' });
  }

  try {
    await prisma.user.findFirst({ select: { id: true } });
  } catch {
    console.error('[ready] READINESS_DATABASE_UNAVAILABLE');
    return res.status(503).json({ status: 'not_ready' });
  }

  try {
    const storage = createStorageProvider();
    await storage.readiness();
  } catch {
    console.error('[ready] READINESS_STORAGE_UNAVAILABLE');
    return res.status(503).json({ status: 'not_ready' });
  }

  return res.status(200).json({ status: 'ready' });
}
