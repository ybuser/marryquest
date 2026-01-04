export interface QuizQuestionDto {
  id?: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  order: number;
}

export interface QuizDto {
  id: string;
  invitationId: string;
  enabled: boolean;
  questions: QuizQuestionDto[];
}

export const EMPTY_QUIZ: QuizDto = {
  id: '',
  invitationId: '',
  enabled: false,
  questions: []
};
