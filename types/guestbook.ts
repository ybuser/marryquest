import type { GuestbookBadge } from '@prisma/client';

export interface GuestbookEntryDto {
  id: string;
  invitationId: string;
  nickname: string;
  message: string;
  badge: GuestbookBadge;
  hidden: boolean;
  createdAt: string;
}

