export const TIMELINE_MIN_CARDS = 5;
export const TIMELINE_MAX_CARDS = 7;

export type TimelineReadinessReason =
  | 'too_few_cards'
  | 'too_many_cards'
  | 'blank_title'
  | 'invalid_correct_order'
  | 'duplicate_correct_order'
  | 'out_of_range_correct_order';

export type TimelineReadiness =
  | { status: 'empty' }
  | { status: 'incomplete'; reason: TimelineReadinessReason }
  | { status: 'ready' };

interface TimelineReadinessCard {
  text: string;
  correctOrder: number;
}

export function getTimelineReadiness(cards: readonly TimelineReadinessCard[]): TimelineReadiness {
  if (cards.length === 0) {
    return { status: 'empty' };
  }

  if (cards.length < TIMELINE_MIN_CARDS) {
    return { status: 'incomplete', reason: 'too_few_cards' };
  }

  if (cards.length > TIMELINE_MAX_CARDS) {
    return { status: 'incomplete', reason: 'too_many_cards' };
  }

  if (cards.some((card) => card.text.trim().length === 0)) {
    return { status: 'incomplete', reason: 'blank_title' };
  }

  if (cards.some((card) => !Number.isInteger(card.correctOrder))) {
    return { status: 'incomplete', reason: 'invalid_correct_order' };
  }

  const correctOrders = cards.map((card) => card.correctOrder);
  if (new Set(correctOrders).size !== cards.length) {
    return { status: 'incomplete', reason: 'duplicate_correct_order' };
  }

  if (correctOrders.some((order) => order < 0 || order >= cards.length)) {
    return { status: 'incomplete', reason: 'out_of_range_correct_order' };
  }

  return { status: 'ready' };
}

export function isTimelineReady(cards: readonly TimelineReadinessCard[]) {
  return getTimelineReadiness(cards).status === 'ready';
}
