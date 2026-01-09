export interface TimelineCardDto {
  id: string;
  text: string;
  order: number;
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
