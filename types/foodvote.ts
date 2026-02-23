export interface FoodVoteOptionDto {
  id: string;
  invitationId: string;
  label: string;
  description?: string | null;
  order: number;
  isActive: boolean;
}

export interface FoodVotePublicOptionDto {
  id: string;
  label: string;
  description?: string | null;
  order: number;
  votes: number;
}

export interface FoodVoteResponseDto {
  options: FoodVotePublicOptionDto[];
  alreadyVoted: boolean;
  votedOptionId?: string;
}
