export interface TimelineCardDto {
  id: string;
  text: string;
  description?: string | null;
  photoUrl?: string | null;
  order: number;
  correctOrder: number;
}

export interface TimelinePuzzleDto {
  id: string;
  invitationId: string;
  enabled: boolean;
  cards: TimelineCardDto[];
}

export const EMPTY_TIMELINE: TimelinePuzzleDto = {
  id: '',
  invitationId: '',
  enabled: false,
  cards: []
};
