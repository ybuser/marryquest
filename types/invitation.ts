import type { InvitationStatus, TemplateKey } from '@prisma/client';
import type { QuizDto } from './quiz';
import type { TimelinePuzzleDto } from './timeline';
import type { FoodVoteOptionDto } from './foodvote';

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
  deletedAt?: string | null;
  quiz?: QuizDto | null;
  timelinePuzzle?: TimelinePuzzleDto | null;
  foodVoteOptions?: FoodVoteOptionDto[];
  sections: SectionConfig[];
}

export interface GalleryPhoto {
  id: string;
  url: string;
  caption?: string | null;
  order: number;
}

export const DEFAULT_SECTIONS: { key: string; label: string }[] = [
  { key: 'hero', label: 'Hero' },
  { key: 'info', label: 'Info' },
  { key: 'maps', label: 'Map Buttons' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'quiz', label: 'Quiz' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'foodVote', label: 'Food Vote' },
  { key: 'guestbook', label: 'Guestbook' },
  { key: 'rsvp', label: 'RSVP' }
];
