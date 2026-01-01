import type { InvitationStatus, TemplateKey } from '@prisma/client';

export interface SectionConfig {
  id: string;
  key: string;
  enabled: boolean;
  order: number;
}

export interface InvitationDetails {
  id: string;
  slug: string;
  status: InvitationStatus;
  templateKey: TemplateKey;
  title?: string | null;
  groomName: string;
  brideName: string;
  dateTime: string;
  venueName: string;
  address: string;
  accountGroom?: string | null;
  accountBride?: string | null;
  contactGroom?: string | null;
  contactBride?: string | null;
  sections: SectionConfig[];
}

export const DEFAULT_SECTIONS: { key: string; label: string }[] = [
  { key: 'hero', label: 'Hero' },
  { key: 'details', label: 'Details' },
  { key: 'story', label: 'Our Story' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'rsvp', label: 'RSVP' },
  { key: 'guestbook', label: 'Guestbook' }
];
