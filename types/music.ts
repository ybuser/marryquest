export interface MusicTrackDto {
  id: string;
  title: string;
  artist?: string | null;
  url?: string | null;
  voteCount: number;
}

export interface MusicResponseDto {
  tracks: MusicTrackDto[];
  alreadyUsed: boolean;
}
