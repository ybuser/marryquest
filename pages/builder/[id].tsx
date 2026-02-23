import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import prisma from '@/lib/db';
import { requirePageAuth } from '@/lib/auth';
import { InvitationPage } from '@/components/invitation/InvitationPage';
import type { GalleryPhoto, InvitationDetails, SectionConfig } from '@/types/invitation';
import { DEFAULT_SECTIONS } from '@/types/invitation';
import type { GuestbookEntryDto } from '@/types/guestbook';
import type { QuizDto, QuizQuestionDto } from '@/types/quiz';
import { EMPTY_QUIZ } from '@/types/quiz';
import type { TimelineCardDto, TimelinePuzzleDto } from '@/types/timeline';
import { EMPTY_TIMELINE } from '@/types/timeline';
import type { FoodVoteOptionDto } from '@/types/foodvote';

interface BuilderPageProps {
  invitation: InvitationDetails;
  templateKey: string;
  photos: GalleryPhoto[];
  guestbookEntries: GuestbookEntryDto[];
  timelinePuzzle: TimelinePuzzleDto | null;
}

const tabs = ['Basic', 'Sections', 'Guestbook', 'Quiz', 'Timeline', 'Publish', 'Export'] as const;
type TabKey = (typeof tabs)[number];

interface SortableItemProps {
  section: SectionConfig;
  label: string;
  onToggle: (section: SectionConfig) => void;
}

interface SortableTimelineCardProps {
  card: TimelineCardDto;
  onChange: (id: string, updates: Partial<TimelineCardDto>) => void;
  onPhotoUpload: (id: string, file: File) => void;
  uploading: boolean;
  onRemove: (id: string) => void;
}

interface SortableTimelineOrderItemProps {
  card: TimelineCardDto;
}

interface SortableFoodOptionProps {
  option: FoodVoteOptionDto;
  onChange: (id: string, updates: Partial<FoodVoteOptionDto>) => void;
  onRemove: (id: string) => void;
}

function SortableItem({ section, label, onToggle }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
    >
      <div className="flex items-center gap-3" {...attributes} {...listeners}>
        <span className="cursor-grab text-slate-500">⋮⋮</span>
        <span className="font-medium">{label}</span>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={section.enabled}
          onChange={() => onToggle(section)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Enabled
      </label>
    </div>
  );
}

function SortableTimelineCard({ card, onChange, onPhotoUpload, uploading, onRemove }: SortableTimelineCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
    >
      <div className="flex items-center gap-3" {...attributes} {...listeners}>
        <span className="cursor-grab text-slate-400">⋮⋮</span>
      </div>
      <div className="flex-1 space-y-2">
        <input
          value={card.text}
          maxLength={120}
          onChange={(event) => onChange(card.id, { text: event.target.value })}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="Title"
        />
        <textarea
          value={card.description ?? ''}
          maxLength={240}
          rows={2}
          onChange={(event) => onChange(card.id, { description: event.target.value })}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="Short description"
        />
        <div className="flex items-center gap-3">
          {card.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.photoUrl} alt="" className="h-16 w-16 rounded-md object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-slate-200 text-xs text-slate-400">
              No photo
            </div>
          )}
          <label className="text-xs font-semibold text-slate-600">
            <span className="rounded-md border border-slate-200 px-3 py-2 shadow-sm hover:bg-slate-50">
              {uploading ? 'Uploading…' : card.photoUrl ? 'Replace photo' : 'Upload photo'}
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  onPhotoUpload(card.id, file);
                }
                event.target.value = '';
              }}
              disabled={uploading}
            />
          </label>
          {card.photoUrl && (
            <button
              type="button"
              onClick={() => onChange(card.id, { photoUrl: null })}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(card.id)}
        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
      >
        Remove
      </button>
    </div>
  );
}

function SortableTimelineOrderItem({ card }: SortableTimelineOrderItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
      {...attributes}
      {...listeners}
    >
      <span className="cursor-grab text-slate-400">⋮⋮</span>
      <span className="font-medium">{card.text || 'Untitled'}</span>
    </div>
  );
}


function SortableFoodOption({ option, onChange, onRemove }: SortableFoodOptionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: option.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="pt-2" {...attributes} {...listeners}>
        <span className="cursor-grab text-slate-400">⋮⋮</span>
      </div>
      <div className="flex-1 space-y-2">
        <input
          value={option.label}
          onChange={(event) => onChange(option.id, { label: event.target.value })}
          maxLength={80}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="메뉴 이름"
        />
        <input
          value={option.description ?? ''}
          onChange={(event) => onChange(option.id, { description: event.target.value })}
          maxLength={200}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="설명 (선택)"
        />
      </div>
      <button type="button" onClick={() => onRemove(option.id)} className="text-xs font-semibold text-slate-500 hover:text-slate-700">
        Remove
      </button>
    </div>
  );
}

export default function InvitationBuilder({
  invitation: initialInvitation,
  photos,
  guestbookEntries,
  timelinePuzzle
}: BuilderPageProps) {
  const [savedInvitation, setSavedInvitation] = useState<InvitationDetails>(initialInvitation);
  const [draftInvitation, setDraftInvitation] = useState<InvitationDetails>(initialInvitation);
  const [savedSections, setSavedSections] = useState<SectionConfig[]>(initialInvitation.sections);
  const [draftSections, setDraftSections] = useState<SectionConfig[]>(initialInvitation.sections);
  const [savedGuestbookEntries, setSavedGuestbookEntries] = useState<GuestbookEntryDto[]>(guestbookEntries);
  const [draftGuestbookEntries, setDraftGuestbookEntries] = useState<GuestbookEntryDto[]>(guestbookEntries);
  const initialQuiz = initialInvitation.quiz ?? { ...EMPTY_QUIZ, invitationId: initialInvitation.id };
  const initialTimeline = timelinePuzzle ?? { ...EMPTY_TIMELINE, invitationId: initialInvitation.id };
  const [savedQuiz, setSavedQuiz] = useState<QuizDto>(initialQuiz);
  const [draftQuiz, setDraftQuiz] = useState<QuizDto>(initialQuiz);
  const [savedTimeline, setSavedTimeline] = useState<TimelinePuzzleDto>(initialTimeline);
  const [draftTimeline, setDraftTimeline] = useState<TimelinePuzzleDto>(initialTimeline);
  const [savedFoodVoteOptions, setSavedFoodVoteOptions] = useState<FoodVoteOptionDto[]>(initialInvitation.foodVoteOptions ?? []);
  const [draftFoodVoteOptions, setDraftFoodVoteOptions] = useState<FoodVoteOptionDto[]>(initialInvitation.foodVoteOptions ?? []);
  const [activeTab, setActiveTab] = useState<TabKey>('Basic');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const [rsvpSummary, setRsvpSummary] = useState<{
    countsByAttendance: { yes: number; no: number; maybe: number };
    totals: { guestsTotal: number; kidsTotal: number; responsesTotal: number };
    recentSampleCount?: number;
  } | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [basicSaving, setBasicSaving] = useState(false);
  const [sectionsSaving, setSectionsSaving] = useState(false);
  const [guestbookSaving, setGuestbookSaving] = useState(false);
  const [quizSaving, setQuizSaving] = useState(false);
  const [timelineSaving, setTimelineSaving] = useState(false);
  const [foodVoteSaving, setFoodVoteSaving] = useState(false);
  const [timelineUploadingId, setTimelineUploadingId] = useState<string | null>(null);
  const [timelineUploadError, setTimelineUploadError] = useState<string | null>(null);
  const [publishSaving, setPublishSaving] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const router = useRouter();

  const lastErrorTimeRef = useRef(0);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    async function fetchSummary() {
      setRsvpLoading(true);
      const response = await fetch(`/api/invitations/${savedInvitation.id}/rsvp-summary`);
      if (response.ok) {
        const data = await response.json();
        setRsvpSummary(data);
      }
      setRsvpLoading(false);
    }

    if (activeTab === 'Export' && !rsvpSummary && !rsvpLoading) {
      void fetchSummary();
    }
  }, [activeTab, savedInvitation.id, rsvpLoading, rsvpSummary]);

  const hasBasicChanges = useMemo(() => {
    const fields: (keyof InvitationDetails)[] = [
      'groomName',
      'brideName',
      'dateTime',
      'venueName',
      'address',
      'accountGroom',
      'accountBride',
      'contactGroom',
      'contactBride'
    ];

    return (
      fields.some((field) => draftInvitation[field] !== savedInvitation[field]) ||
      draftInvitation.templateKey !== savedInvitation.templateKey
    );
  }, [draftInvitation, savedInvitation]);

  const hasSectionsChanges = useMemo(() => {
    if (draftSections.length !== savedSections.length) return true;
    return draftSections.some((section, index) => {
      const saved = savedSections[index];
      return section.id !== saved.id || section.enabled !== saved.enabled || section.order !== saved.order;
    });
  }, [draftSections, savedSections]);

  const hasGuestbookChanges = useMemo(() => {
    if (draftGuestbookEntries.length !== savedGuestbookEntries.length) return true;
    return draftGuestbookEntries.some((entry, index) => {
      const saved = savedGuestbookEntries[index];
      return entry.id !== saved.id || entry.hidden !== saved.hidden;
    });
  }, [draftGuestbookEntries, savedGuestbookEntries]);

  const hasQuizChanges = useMemo(() => {
    if (draftQuiz.enabled !== savedQuiz.enabled) return true;
    if (draftQuiz.questions.length !== savedQuiz.questions.length) return true;

    return draftQuiz.questions.some((question, index) => {
      const saved = savedQuiz.questions[index];
      if (!saved) return true;
      if (question.prompt !== saved.prompt || question.correctIndex !== saved.correctIndex) return true;
      if (question.options.length !== saved.options.length) return true;
    return question.options.some((option, optionIndex) => option !== saved.options[optionIndex]);
    });
  }, [draftQuiz, savedQuiz]);

  const hasFoodVoteChanges = useMemo(() => {
    if (draftFoodVoteOptions.length !== savedFoodVoteOptions.length) return true;
    return draftFoodVoteOptions.some((option, index) => {
      const saved = savedFoodVoteOptions[index];
      if (!saved) return true;
      return option.label !== saved.label || option.description !== saved.description || option.order !== saved.order;
    });
  }, [draftFoodVoteOptions, savedFoodVoteOptions]);

  const hasTimelineChanges = useMemo(() => {
    if (draftTimeline.enabled !== savedTimeline.enabled) return true;
    if (draftTimeline.cards.length !== savedTimeline.cards.length) return true;
    return draftTimeline.cards.some((card, index) => {
      const saved = savedTimeline.cards[index];
      if (!saved) return true;
      return (
        card.text !== saved.text ||
        card.description !== saved.description ||
        card.photoUrl !== saved.photoUrl ||
        card.order !== saved.order ||
        card.correctOrder !== saved.correctOrder
      );
    });
  }, [draftTimeline, savedTimeline]);

  const hasPublishChanges = useMemo(
    () => draftInvitation.slug !== savedInvitation.slug || draftInvitation.status !== savedInvitation.status,
    [draftInvitation.slug, draftInvitation.status, savedInvitation.slug, savedInvitation.status]
  );

  const hasUnsavedChanges =
    hasBasicChanges ||
    hasSectionsChanges ||
    hasGuestbookChanges ||
    hasQuizChanges ||
    hasFoodVoteChanges ||
    hasTimelineChanges ||
    hasPublishChanges;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }

    const handler = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  function showError(message: string) {
    const now = Date.now();
    if (statusMessage === message && now - lastErrorTimeRef.current < 5000) {
      return;
    }
    lastErrorTimeRef.current = now;
    setStatusMessage(message);
  }

  function resetStatus(message: string | null = null) {
    setStatusMessage(message);
  }

  async function saveBasic() {
    setBasicSaving(true);
    resetStatus('Saving…');
    try {
      const response = await fetch(`/api/invitations/${savedInvitation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groomName: draftInvitation.groomName,
          brideName: draftInvitation.brideName,
          dateTime: draftInvitation.dateTime,
          venueName: draftInvitation.venueName,
          address: draftInvitation.address,
          accountGroom: draftInvitation.accountGroom,
          accountBride: draftInvitation.accountBride,
          contactGroom: draftInvitation.contactGroom,
          contactBride: draftInvitation.contactBride,
          templateKey: draftInvitation.templateKey,
          slug: savedInvitation.slug
        })
      });

      if (!response.ok) {
        showError('Failed to save basic details');
        return;
      }

      const updated = await response.json();
      const normalizedDate = updated.dateTime ? new Date(updated.dateTime).toISOString() : draftInvitation.dateTime;
      const next = { ...draftInvitation, ...updated, dateTime: normalizedDate } as InvitationDetails;
      setSavedInvitation((prev) => ({ ...prev, ...next }));
      setDraftInvitation((prev) => ({ ...prev, ...next }));
      resetStatus('Saved');
    } catch (error) {
      console.error(error);
      showError('Failed to save basic details');
    } finally {
      setBasicSaving(false);
    }
  }

  async function saveSections() {
    setSectionsSaving(true);
    resetStatus('Saving…');
    try {
      const response = await fetch(`/api/invitations/${savedInvitation.id}/sections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: draftSections })
      });

      if (!response.ok) {
        showError('Unable to update sections');
        return;
      }

      const updated: SectionConfig[] = await response.json();
      setSavedSections(updated);
      setDraftSections(updated);
      setSavedInvitation((prev) => ({ ...prev, sections: updated }));
      setDraftInvitation((prev) => ({ ...prev, sections: updated }));
      resetStatus('Saved');
    } catch (error) {
      console.error(error);
      showError('Unable to update sections');
    } finally {
      setSectionsSaving(false);
    }
  }

  async function saveGuestbook() {
    setGuestbookSaving(true);
    resetStatus('Saving…');

    const updates = draftGuestbookEntries
      .filter((entry, index) => entry.hidden !== savedGuestbookEntries[index]?.hidden)
      .map((entry) => ({ id: entry.id, hidden: entry.hidden }));

    if (updates.length === 0) {
      resetStatus('Saved');
      setGuestbookSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/guestbook', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (!response.ok) {
        showError('Unable to update guestbook');
        return;
      }

      const refreshed: GuestbookEntryDto[] = await response.json();
      setSavedGuestbookEntries(refreshed);
      setDraftGuestbookEntries(refreshed);
      resetStatus('Saved');
    } catch (error) {
      console.error(error);
      showError('Unable to update guestbook');
    } finally {
      setGuestbookSaving(false);
    }
  }

  function addQuizQuestion() {
    setDraftQuiz((prev) => {
      if (prev.questions.length >= 5) return prev;
      return {
        ...prev,
        questions: [
          ...prev.questions,
          {
            prompt: '',
            options: ['', '', '', ''],
            correctIndex: 0,
            order: prev.questions.length
          }
        ]
      };
    });
  }

  function updateQuizQuestion(index: number, updates: Partial<QuizQuestionDto>) {
    setDraftQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, ...updates } : question
      )
    }));
  }

  function updateQuizOption(questionIndex: number, optionIndex: number, value: string) {
    setDraftQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((question, qIndex) => {
        if (qIndex !== questionIndex) return question;
        const nextOptions = question.options.map((option, optIndex) =>
          optIndex === optionIndex ? value : option
        );
        return { ...question, options: nextOptions };
      })
    }));
  }

  function removeQuizQuestion(index: number) {
    setDraftQuiz((prev) => ({
      ...prev,
      questions: prev.questions
        .filter((_, questionIndex) => questionIndex !== index)
        .map((question, order) => ({ ...question, order }))
    }));
  }

  function createTimelineCard(order: number): TimelineCardDto {
    return {
      id: `temp-${Math.random().toString(36).slice(2, 9)}`,
      text: '',
      description: '',
      photoUrl: null,
      order,
      correctOrder: order
    };
  }

  function addTimelineCard() {
    setDraftTimeline((prev) => {
      if (prev.cards.length >= 7) return prev;
      return {
        ...prev,
        cards: [...prev.cards, createTimelineCard(prev.cards.length)]
      };
    });
  }

  function updateTimelineCard(id: string, updates: Partial<TimelineCardDto>) {
    setDraftTimeline((prev) => ({
      ...prev,
      cards: prev.cards.map((card) => (card.id === id ? { ...card, ...updates } : card))
    }));
  }

  function removeTimelineCard(id: string) {
    setDraftTimeline((prev) => {
      const remaining = prev.cards
        .filter((card) => card.id !== id)
        .map((card, order) => ({ ...card, order }));
      const correctOrderMap = new Map(
        [...remaining].sort((a, b) => a.correctOrder - b.correctOrder).map((card, index) => [card.id, index])
      );
      return {
        ...prev,
        cards: remaining.map((card) => ({ ...card, correctOrder: correctOrderMap.get(card.id) ?? card.correctOrder }))
      };
    });
  }

  async function saveQuiz() {
    setQuizSaving(true);
    resetStatus('Saving…');

    const trimmedQuestions = draftQuiz.questions.map((question) => ({
      prompt: question.prompt.trim(),
      options: question.options.map((option) => option.trim()),
      correctIndex: question.correctIndex
    }));

    if (draftQuiz.enabled && trimmedQuestions.length === 0) {
      showError('Add at least one question to enable the quiz');
      setQuizSaving(false);
      return;
    }

    const invalidQuestion = trimmedQuestions.some(
      (question) => !question.prompt || question.options.some((option) => !option)
    );

    if (invalidQuestion) {
      showError('Please fill in all prompts and options');
      setQuizSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/quiz/${savedInvitation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: draftQuiz.enabled,
          questions: trimmedQuestions
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        showError(payload?.error ?? 'Unable to save quiz');
        return;
      }

      const updated: QuizDto | null = await response.json();
      const normalizedQuiz = updated ?? { ...EMPTY_QUIZ, invitationId: savedInvitation.id };
      setSavedQuiz(normalizedQuiz);
      setDraftQuiz(normalizedQuiz);
      setSavedInvitation((prev) => ({ ...prev, quiz: normalizedQuiz }));
      setDraftInvitation((prev) => ({ ...prev, quiz: normalizedQuiz }));
      resetStatus('Saved');
    } catch (error) {
      console.error(error);
      showError('Unable to save quiz');
    } finally {
      setQuizSaving(false);
    }
  }

  async function saveTimeline() {
    setTimelineSaving(true);
    resetStatus('Saving…');

    const trimmedCards = draftTimeline.cards.map((card) => ({
      ...card,
      text: card.text.trim(),
      description: card.description?.trim() || null
    }));

    if (draftTimeline.enabled) {
      if (trimmedCards.length < 5 || trimmedCards.length > 7) {
        showError('Timeline needs 5 to 7 cards');
        setTimelineSaving(false);
        return;
      }

      if (trimmedCards.some((card) => !card.text)) {
        showError('Please fill in all timeline cards');
        setTimelineSaving(false);
        return;
      }

      const correctOrders = trimmedCards.map((card) => card.correctOrder);
      const uniqueOrders = new Set(correctOrders);
      if (uniqueOrders.size !== trimmedCards.length) {
        showError('Correct order values must be unique');
        setTimelineSaving(false);
        return;
      }
      const maxOrder = Math.max(...correctOrders);
      if (maxOrder >= trimmedCards.length) {
        showError('Correct order values must be within card range');
        setTimelineSaving(false);
        return;
      }
    }

    try {
      const response = await fetch(`/api/timeline/${savedInvitation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: draftTimeline.enabled,
          cards: trimmedCards.map((card) => ({
            text: card.text,
            description: card.description,
            photoUrl: card.photoUrl,
            correctOrder: card.correctOrder
          }))
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        showError(payload?.error ?? 'Unable to save timeline');
        return;
      }

      const updated: TimelinePuzzleDto = await response.json();
      setSavedTimeline(updated);
      setDraftTimeline(updated);
      setSavedInvitation((prev) => ({ ...prev, timelinePuzzle: updated }));
      setDraftInvitation((prev) => ({ ...prev, timelinePuzzle: updated }));
      resetStatus('Saved');
    } catch (error) {
      console.error(error);
      showError('Unable to save timeline');
    } finally {
      setTimelineSaving(false);
    }
  }

  async function uploadTimelineCardPhoto(cardId: string, file: File) {
    setTimelineUploadingId(cardId);
    setTimelineUploadError(null);
    try {
      const formData = new FormData();
      formData.append('invitationId', savedInvitation.id);
      formData.append('cardId', cardId);
      formData.append('file', file);

      const response = await fetch('/api/upload/timeline-card', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setTimelineUploadError(payload?.error ?? 'Unable to upload photo');
        return;
      }

      const payload: { url: string } = await response.json();
      updateTimelineCard(cardId, { photoUrl: payload.url });
    } catch (error) {
      console.error(error);
      setTimelineUploadError('Unable to upload photo');
    } finally {
      setTimelineUploadingId(null);
    }
  }

  async function savePublish() {
    setPublishSaving(true);
    resetStatus('Saving…');

    try {
      if (draftInvitation.slug !== savedInvitation.slug) {
        const slugResponse = await fetch(`/api/invitations/${savedInvitation.id}/slug`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: draftInvitation.slug.trim() })
        });

        if (!slugResponse.ok) {
          const error = await slugResponse.json();
          setSlugError(Array.isArray(error.error) ? error.error.join(', ') : error.error);
          showError('Failed to update slug');
          return;
        }

        const updated = await slugResponse.json();
        setDraftInvitation((prev) => ({ ...prev, slug: updated.slug }));
        setSavedInvitation((prev) => ({ ...prev, slug: updated.slug }));
        setSlugError(null);
      }

      if (draftInvitation.status !== savedInvitation.status) {
        const statusResponse = await fetch(`/api/invitations/${savedInvitation.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: draftInvitation.status })
        });

        if (!statusResponse.ok) {
          showError('Unable to update status');
          return;
        }

        const updated = await statusResponse.json();
        setDraftInvitation((prev) => ({ ...prev, status: updated.status }));
        setSavedInvitation((prev) => ({ ...prev, status: updated.status }));
      }

      resetStatus('Saved');
    } catch (error) {
      console.error(error);
      showError('Unable to save publish settings');
    } finally {
      setPublishSaving(false);
    }
  }

  async function deleteInvitation() {
    if (!window.confirm('Delete this invitation? This action cannot be undone.')) {
      return;
    }

    setDeleteSaving(true);
    try {
      const response = await fetch(`/api/invitations/${savedInvitation.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Failed to delete invitation');
      }

      await router.push('/dashboard');
    } catch (error) {
      console.error(error);
      alert('Failed to delete invitation');
    } finally {
      setDeleteSaving(false);
    }
  }

  const orderedSections = useMemo(() => {
    const merged = DEFAULT_SECTIONS.map((def, index) =>
      draftSections.find((section) => section.key === def.key) ?? {
        id: `${draftInvitation.id}-${def.key}`,
        key: def.key,
        enabled: def.key === 'quiz' || def.key === 'timeline' ? false : true,
        order: index
      }
    );

    return merged.sort((a, b) => a.order - b.order);
  }, [draftInvitation.id, draftSections]);

  const orderedTimelineCards = useMemo(
    () => [...draftTimeline.cards].sort((a, b) => a.order - b.order),
    [draftTimeline.cards]
  );
  const orderedCorrectCards = useMemo(
    () => [...draftTimeline.cards].sort((a, b) => a.correctOrder - b.correctOrder),
    [draftTimeline.cards]
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentIndex = orderedSections.findIndex((item) => item.id === active.id);
    const overIndex = orderedSections.findIndex((item) => item.id === over.id);
    const newSections = arrayMove(orderedSections, currentIndex, overIndex).map((section, index) => ({
      ...section,
      order: index
    }));

    setDraftSections(newSections);
  }

  function handleTimelineDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentIndex = orderedTimelineCards.findIndex((item) => item.id === active.id);
    const overIndex = orderedTimelineCards.findIndex((item) => item.id === over.id);
    const nextCards = arrayMove(orderedTimelineCards, currentIndex, overIndex).map((card, index) => ({
      ...card,
      order: index
    }));

    setDraftTimeline((prev) => ({ ...prev, cards: nextCards }));
  }

  function handleCorrectOrderDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentIndex = orderedCorrectCards.findIndex((item) => item.id === active.id);
    const overIndex = orderedCorrectCards.findIndex((item) => item.id === over.id);
    const nextCards = arrayMove(orderedCorrectCards, currentIndex, overIndex).map((card, index) => ({
      ...card,
      correctOrder: index
    }));

    setDraftTimeline((prev) => ({
      ...prev,
      cards: prev.cards.map((card) => nextCards.find((next) => next.id === card.id) ?? card)
    }));
  }

  function handleToggle(section: SectionConfig) {
    const updated = orderedSections.map((item) => (item.id === section.id ? { ...item, enabled: !item.enabled } : item));
    setDraftSections(updated);
  }


  const orderedFoodVoteOptions = useMemo(
    () => [...draftFoodVoteOptions].sort((a, b) => a.order - b.order),
    [draftFoodVoteOptions]
  );

  function handleFoodVoteDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const currentIndex = orderedFoodVoteOptions.findIndex((item) => item.id === active.id);
    const overIndex = orderedFoodVoteOptions.findIndex((item) => item.id === over.id);
    const next = arrayMove(orderedFoodVoteOptions, currentIndex, overIndex).map((item, index) => ({ ...item, order: index }));
    setDraftFoodVoteOptions(next);
  }

  function updateFoodVoteOption(id: string, updates: Partial<FoodVoteOptionDto>) {
    setDraftFoodVoteOptions((prev) => prev.map((option) => (option.id === id ? { ...option, ...updates } : option)));
  }

  function addFoodVoteOption() {
    setDraftFoodVoteOptions((prev) => {
      if (prev.length >= 6) return prev;
      return [...prev, { id: `draft-food-${Date.now()}`, invitationId: savedInvitation.id, label: '', description: null, order: prev.length, isActive: true }];
    });
  }

  function removeFoodVoteOption(id: string) {
    setDraftFoodVoteOptions((prev) => prev.filter((option) => option.id !== id).map((option, index) => ({ ...option, order: index })));
  }

  async function saveFoodVoteOptions() {
    setFoodVoteSaving(true);
    resetStatus('Saving…');
    const cleaned = orderedFoodVoteOptions.map((option) => ({
      label: option.label.trim(),
      description: option.description?.trim() || null,
      isActive: true
    }));

    if (cleaned.length < 2 || cleaned.length > 6) {
      showError('Food vote options must be between 2 and 6');
      setFoodVoteSaving(false);
      return;
    }

    if (cleaned.some((option) => !option.label)) {
      showError('Please fill in all food vote labels');
      setFoodVoteSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/food-vote/${savedInvitation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: cleaned })
      });

      if (!response.ok) {
        showError('Unable to save food vote options');
        return;
      }

      const updated: FoodVoteOptionDto[] = await response.json();
      setSavedFoodVoteOptions(updated);
      setDraftFoodVoteOptions(updated);
      setSavedInvitation((prev) => ({ ...prev, foodVoteOptions: updated }));
      setDraftInvitation((prev) => ({ ...prev, foodVoteOptions: updated }));
      resetStatus('Saved');
    } catch (error) {
      console.error(error);
      showError('Unable to save food vote options');
    } finally {
      setFoodVoteSaving(false);
    }
  }

  function handleGuestbookToggle(entryId: string) {
    setDraftGuestbookEntries((prev) =>
      prev.map((entry) => (entry.id === entryId ? { ...entry, hidden: !entry.hidden } : entry))
    );
  }

  const publishUrl = useMemo(() => {
    const slugPart = draftInvitation.slug?.trim() ?? '';
    if (!origin) return slugPart ? `/${slugPart}` : '';
    return `${origin}/${slugPart}`;
  }, [draftInvitation.slug, origin]);

  useEffect(() => {
    if (!copyMessage) return;
    const timer = setTimeout(() => setCopyMessage(null), 1500);
    return () => clearTimeout(timer);
  }, [copyMessage]);

  async function copyPublishUrl() {
    if (!publishUrl) return;

    try {
      await navigator.clipboard.writeText(publishUrl);
      setCopyMessage('Copied!');
    } catch (error) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = publishUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopyMessage('Copied!');
      } catch (fallbackError) {
        console.error(fallbackError);
        showError('Unable to copy link');
      }
    }
  }

  const guestbookDate = (value: string) =>
    new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));

  const guestbookBadgeLabel = (badge: GuestbookEntryDto['badge']) => {
    if (badge === 'none') return null;
    const label = badge.replace(/_/g, ' ');
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const unsavedLabel = (tab: TabKey) => {
    const hasChanges =
      tab === 'Basic'
        ? hasBasicChanges
        : tab === 'Sections'
          ? hasSectionsChanges
          : tab === 'Guestbook'
            ? hasGuestbookChanges
              : tab === 'Quiz'
                ? hasQuizChanges
                : tab === 'Timeline'
                  ? hasTimelineChanges
                : tab === 'Publish'
                  ? hasPublishChanges
                  : false;

    return hasChanges ? (
      <span className="text-xs font-medium text-amber-700">Unsaved changes</span>
    ) : (
      <span className="text-xs text-slate-500">Saved</span>
    );
  };

  const tabHasChanges = (tab: TabKey) =>
    tab === 'Basic'
      ? hasBasicChanges
      : tab === 'Sections'
        ? hasSectionsChanges
        : tab === 'Guestbook'
          ? hasGuestbookChanges
            : tab === 'Quiz'
              ? hasQuizChanges
              : tab === 'Timeline'
                ? hasTimelineChanges
              : tab === 'Publish'
                ? hasPublishChanges
                : false;

  const discardDraftChanges = (tab: TabKey) => {
    if (tab === 'Basic' || tab === 'Publish') {
      setDraftInvitation(savedInvitation);
      setSlugError(null);
      resetStatus(null);
      return;
    }

    if (tab === 'Sections') {
      setDraftSections(savedSections);
      setDraftInvitation((prev) => ({ ...prev, sections: savedSections }));
      resetStatus(null);
      return;
    }

    if (tab === 'Guestbook') {
      setDraftGuestbookEntries(savedGuestbookEntries);
      resetStatus(null);
      return;
    }

    if (tab === 'Quiz') {
      setDraftQuiz(savedQuiz);
      resetStatus(null);
    }

    if (tab === 'Timeline') {
      setDraftTimeline(savedTimeline);
      resetStatus(null);
    }
  };

  const trySwitchTab = (nextTab: TabKey) => {
    if (nextTab === activeTab) return;
    if (!tabHasChanges(activeTab)) {
      setActiveTab(nextTab);
      return;
    }

    if (window.confirm('저장하지 않은 변경사항이 있습니다. 저장하지 않고 이동할까요?')) {
      discardDraftChanges(activeTab);
      setActiveTab(nextTab);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Head>
        <title>Invitation Builder • {draftInvitation.title ?? 'Untitled'}</title>
      </Head>
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row">
        <div className="w-full space-y-4 lg:w-1/2">
          {statusMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm">
              <span>ℹ️</span>
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto rounded-lg bg-white p-2 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`rounded-md px-3 py-2 text-sm font-medium ${activeTab === tab ? 'bg-slate-900 text-white' : 'text-slate-700'}`}
                onClick={() => trySwitchTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Basic' && (
            <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                {unsavedLabel('Basic')}
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={saveBasic}
                  disabled={!hasBasicChanges || basicSaving}
                >
                  {basicSaving ? 'Saving…' : 'Save Basic'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Groom name
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.groomName}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, groomName: e.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Bride name
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.brideName}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, brideName: e.target.value }))}
                  />
                </label>
              </div>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Wedding date &amp; time
                <input
                  type="datetime-local"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={draftInvitation.dateTime.slice(0, 16)}
                  onChange={(e) =>
                    setDraftInvitation((prev) => ({ ...prev, dateTime: new Date(e.target.value).toISOString() }))
                  }
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Venue name
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.venueName}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, venueName: e.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Address
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.address}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, address: e.target.value }))}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Accounts (groom)
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.accountGroom ?? ''}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, accountGroom: e.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Accounts (bride)
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.accountBride ?? ''}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, accountBride: e.target.value }))}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Contacts (groom)
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.contactGroom ?? ''}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, contactGroom: e.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Contacts (bride)
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.contactBride ?? ''}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, contactBride: e.target.value }))}
                  />
                </label>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Template</p>
                <div className="flex flex-wrap gap-3">
                  {['mono', 'editorial', 'film'].map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDraftInvitation((prev) => ({ ...prev, templateKey: key as any }))}
                      className={`rounded-lg border px-4 py-3 text-sm capitalize shadow-sm ${
                        draftInvitation.templateKey === key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Sections' && (
            <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                {unsavedLabel('Sections')}
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={saveSections}
                  disabled={!hasSectionsChanges || sectionsSaving}
                >
                  {sectionsSaving ? 'Saving…' : 'Save Sections'}
                </button>
              </div>
              <p className="text-sm text-slate-700">Drag to reorder sections. Toggle visibility as needed.</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={orderedSections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {orderedSections.map((section) => (
                      <SortableItem
                        key={section.id}
                        section={section}
                        label={DEFAULT_SECTIONS.find((def) => def.key === section.key)?.label ?? section.key}
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <div className="mt-6 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">FoodVote options</p>
                    <p className="text-xs text-slate-600">2~6개 옵션을 관리하고 드래그로 순서를 조정하세요.</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={addFoodVoteOption} disabled={orderedFoodVoteOptions.length >= 6} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">Add option</button>
                    <button type="button" onClick={saveFoodVoteOptions} disabled={!hasFoodVoteChanges || foodVoteSaving} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{foodVoteSaving ? 'Saving…' : 'Save FoodVote'}</button>
                  </div>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFoodVoteDragEnd}>
                  <SortableContext items={orderedFoodVoteOptions.map((option) => option.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {orderedFoodVoteOptions.map((option) => (
                        <SortableFoodOption key={option.id} option={option} onChange={updateFoodVoteOption} onRemove={removeFoodVoteOption} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )}

          {activeTab === 'Guestbook' && (
            <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                {unsavedLabel('Guestbook')}
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={saveGuestbook}
                  disabled={!hasGuestbookChanges || guestbookSaving}
                >
                  {guestbookSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
              <p className="text-sm text-slate-700">Toggle visibility to hide messages from the public guestbook.</p>
              <div className="space-y-3">
                {draftGuestbookEntries.length === 0 && (
                  <p className="text-sm text-slate-600">No guestbook entries yet.</p>
                )}
                {draftGuestbookEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{entry.nickname}</p>
                        <p className="text-slate-700">{entry.message}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span>{guestbookDate(entry.createdAt)}</span>
                          {guestbookBadgeLabel(entry.badge) && (
                            <span className="inline-flex rounded-full bg-slate-200 px-2 py-1 font-medium text-slate-800">
                              {guestbookBadgeLabel(entry.badge)}
                            </span>
                          )}
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={entry.hidden}
                          onChange={() => handleGuestbookToggle(entry.id)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        Hidden
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Quiz' && (
            <div className="space-y-5 rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                {unsavedLabel('Quiz')}
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={saveQuiz}
                  disabled={!hasQuizChanges || quizSaving}
                >
                  {quizSaving ? 'Saving…' : 'Save Quiz'}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Enable quiz</p>
                  <p className="text-xs text-slate-600">Guests will only see the quiz once this invitation is published.</p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={draftQuiz.enabled}
                  onChange={(event) =>
                    setDraftQuiz((prev) => ({
                      ...prev,
                      enabled: event.target.checked
                    }))
                  }
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Questions</h3>
                    <p className="text-xs text-slate-600">Add up to 5 questions with exactly 4 options each.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addQuizQuestion}
                    disabled={draftQuiz.questions.length >= 5 || quizSaving}
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Add question
                  </button>
                </div>

                {draftQuiz.questions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-700">
                    Start by adding your first question. Quiz changes are only saved when you click “Save Quiz”.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {draftQuiz.questions.map((question, questionIndex) => (
                      <div
                        key={questionIndex}
                        className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <label className="flex-1 space-y-1 text-sm font-medium text-slate-700">
                            <div className="flex items-center justify-between">
                              <span>Prompt</span>
                              <span className="text-xs text-slate-500">{question.prompt.length}/120</span>
                            </div>
                            <input
                              maxLength={120}
                              value={question.prompt}
                              onChange={(e) =>
                                updateQuizQuestion(questionIndex, {
                                  prompt: e.target.value,
                                  order: questionIndex
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2"
                              placeholder="e.g. Who met first?"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeQuizQuestion(questionIndex)}
                            disabled={quizSaving}
                            className="self-start rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          {question.options.map((option, optionIndex) => (
                            <label key={optionIndex} className="space-y-1 text-sm font-medium text-slate-700">
                              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                                <span>Option {optionIndex + 1}</span>
                                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                                  <input
                                    type="radio"
                                    name={`correct-${questionIndex}`}
                                    checked={question.correctIndex === optionIndex}
                                    onChange={() =>
                                      updateQuizQuestion(questionIndex, { correctIndex: optionIndex })
                                    }
                                  />
                                  Correct
                                </span>
                              </div>
                              <input
                                maxLength={120}
                                value={option}
                                onChange={(e) => updateQuizOption(questionIndex, optionIndex, e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                placeholder={`Option ${optionIndex + 1}`}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Timeline' && (
            <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                {unsavedLabel('Timeline')}
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={saveTimeline}
                  disabled={!hasTimelineChanges || timelineSaving}
                >
                  {timelineSaving ? 'Saving…' : 'Save Timeline'}
                </button>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Enable timeline puzzle</p>
                  <p className="text-xs text-slate-600">Guests will only see the timeline after publishing.</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={draftTimeline.enabled}
                    onChange={() => setDraftTimeline((prev) => ({ ...prev, enabled: !prev.enabled }))}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Enabled
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Timeline cards</h3>
                    <p className="text-xs text-slate-600">Add 5-7 moments for guests to reorder.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addTimelineCard}
                    disabled={draftTimeline.cards.length >= 7}
                    className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Add card
                  </button>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTimelineDragEnd}>
                  <SortableContext items={orderedTimelineCards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {orderedTimelineCards.map((card) => (
                        <SortableTimelineCard
                          key={card.id}
                          card={card}
                          onChange={updateTimelineCard}
                          onPhotoUpload={uploadTimelineCardPhoto}
                          uploading={timelineUploadingId === card.id}
                          onRemove={removeTimelineCard}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                {timelineUploadError && <p className="text-xs text-red-600">{timelineUploadError}</p>}
                {draftTimeline.enabled && draftTimeline.cards.length < 5 && (
                  <p className="text-xs text-amber-600">Add at least 5 cards to enable the puzzle.</p>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Correct order</h3>
                  <p className="text-xs text-slate-600">Drag cards into the correct timeline sequence.</p>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCorrectOrderDragEnd}>
                  <SortableContext items={orderedCorrectCards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {orderedCorrectCards.map((card) => (
                        <SortableTimelineOrderItem key={card.id} card={card} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )}

          {activeTab === 'Publish' && (
            <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                {unsavedLabel('Publish')}
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={savePublish}
                  disabled={!hasPublishChanges || publishSaving}
                >
                  {publishSaving ? 'Saving…' : 'Save Publish'}
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800">Status</p>
                <div className="flex gap-2">
                  {['draft', 'published', 'private'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setDraftInvitation((prev) => ({ ...prev, status: status as any }))}
                      className={`rounded-lg border px-3 py-2 text-sm capitalize shadow-sm ${
                        draftInvitation.status === status ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800">Slug</p>
                <input
                  value={draftInvitation.slug}
                  onChange={(e) => setDraftInvitation((prev) => ({ ...prev, slug: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
                {slugError && <p className="text-xs text-red-600">{slugError}</p>}
                {draftInvitation.status === 'published' && (
                  <div className="mt-3 space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Public URL</p>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-900">
                        <span className="text-slate-600">{origin ? `${origin}/` : '/'}</span>
                        <span className="rounded-full bg-slate-900/5 px-3 py-1 font-mono text-slate-900 underline">
                          {draftInvitation.slug || 'your-slug'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={copyPublishUrl}
                        className="inline-flex items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50"
                        disabled={!draftInvitation.slug}
                      >
                        Copy
                      </button>
                    </div>
                    {copyMessage && <p className="text-xs text-emerald-600">{copyMessage}</p>}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800">Danger zone</p>
                <button
                  type="button"
                  onClick={deleteInvitation}
                  disabled={deleteSaving}
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:opacity-50"
                >
                  {deleteSaving ? 'Deleting…' : 'Delete invitation'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'Export' && (
            <div className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
              <p className="text-base font-semibold text-slate-900">RSVP Summary</p>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">Quick attendance snapshot</p>
              </div>
              <a
                href={`/api/export/rsvp.csv?invitationId=${savedInvitation.id}`}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm"
              >
                Download CSV
              </a>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total Responses</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {rsvpSummary ? rsvpSummary.totals.responsesTotal : rsvpLoading ? '…' : '0'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Guests</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {rsvpSummary ? rsvpSummary.totals.guestsTotal : rsvpLoading ? '…' : '0'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Kids</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {rsvpSummary ? rsvpSummary.totals.kidsTotal : rsvpLoading ? '…' : '0'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Recent Samples</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {rsvpSummary ? rsvpSummary.recentSampleCount ?? 0 : rsvpLoading ? '…' : '0'}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {(['yes', 'maybe', 'no'] as const).map((key) => (
                  <div key={key} className="rounded-lg border border-slate-100 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{key}</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {rsvpSummary ? rsvpSummary.countsByAttendance[key] : rsvpLoading ? '…' : '0'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-full lg:w-1/2">
          <div className="sticky top-6 rounded-3xl bg-white p-4 shadow-lg">
            <p className="mb-3 text-sm text-slate-600">Live preview</p>
            <InvitationPage
              invitation={draftInvitation}
              sections={orderedSections}
              photos={photos}
              quiz={draftQuiz}
              timelinePuzzle={draftTimeline}
              previewGuestbookEntries={draftGuestbookEntries}
              previewMode
              foodVoteOptions={draftFoodVoteOptions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<BuilderPageProps> = async (context) => {
  return requirePageAuth<BuilderPageProps>(context, async (userId) => {
    const id = context.params?.id as string;

    const invitation = await prisma.invitation.findFirst({
      where: {
        userId,
        deletedAt: null,
        OR: [{ id }, { slug: id }]
      },
      include: {
        sections: true,
        galleryPhotos: true,
        quiz: { include: { questions: { orderBy: { order: 'asc' } } } },
        timelinePuzzle: { include: { cards: { orderBy: { order: 'asc' } } } },
        foodVoteOptions: { orderBy: { order: 'asc' } }
      }
    });

    if (!invitation) {
      return { notFound: true };
    }

    const normalizedSections = (
      invitation.sections.length
        ? invitation.sections
        : DEFAULT_SECTIONS.map((section, index) => ({
            id: `${invitation.id}-${section.key}`,
            key: section.key,
            enabled: section.key === 'quiz' || section.key === 'timeline' || section.key === 'foodVote' ? false : true,
            order: index
          }))
    ).sort((a, b) => a.order - b.order);

    const photos: GalleryPhoto[] = invitation.galleryPhotos
      .map((photo) => ({
        id: photo.id,
        url: photo.url,
        caption: photo.caption,
        order: photo.order
      }))
      .sort((a, b) => a.order - b.order);

    const guestbookEntries = await prisma.guestbookEntry
      .findMany({
        where: { invitationId: invitation.id },
        orderBy: { createdAt: 'desc' }
      })
      .then((entries) =>
        entries.map((entry) => ({
          id: entry.id,
          invitationId: entry.invitationId,
          nickname: entry.nickname,
          message: entry.message,
          badge: entry.badge,
          hidden: entry.hidden,
          createdAt: entry.createdAt.toISOString()
        }))
      );

    const quiz: QuizDto | null = invitation.quiz
      ? {
          id: invitation.quiz.id,
          invitationId: invitation.id,
          enabled: invitation.quiz.enabled,
          questions: invitation.quiz.questions
            .map((question) => ({
              id: question.id,
              prompt: question.prompt,
              options: question.options,
              correctIndex: question.correctIndex,
              order: question.order
            }))
            .sort((a, b) => a.order - b.order)
        }
      : { ...EMPTY_QUIZ, invitationId: invitation.id };

    const timelinePuzzle: TimelinePuzzleDto | null = invitation.timelinePuzzle
      ? {
          id: invitation.timelinePuzzle.id,
          invitationId: invitation.id,
          enabled: invitation.timelinePuzzle.enabled,
          cards: invitation.timelinePuzzle.cards
            .map((card) => ({
              id: card.id,
              text: card.text,
              description: card.description,
              photoUrl: card.photoUrl,
              order: card.order,
              correctOrder: card.correctOrder
            }))
            .sort((a, b) => a.order - b.order)
        }
      : { ...EMPTY_TIMELINE, invitationId: invitation.id };

    const invitationDetails: InvitationDetails = {
      id: invitation.id,
      slug: invitation.slug,
      status: invitation.status,
      templateKey: invitation.templateKey,
      title: invitation.title,
      groomName: invitation.groomName,
      brideName: invitation.brideName,
      dateTime: invitation.dateTime.toISOString(),
      venueName: invitation.venueName,
      address: invitation.address,
      accountGroom: invitation.accountGroom,
      accountBride: invitation.accountBride,
      contactGroom: invitation.contactGroom,
      contactBride: invitation.contactBride,
      quiz,
      timelinePuzzle,
      foodVoteOptions: invitation.foodVoteOptions.map((option) => ({
        id: option.id,
        invitationId: option.invitationId,
        label: option.label,
        description: option.description,
        order: option.order,
        isActive: option.isActive
      })),
      sections: normalizedSections
    };

    return {
      props: {
        invitation: invitationDetails,
        templateKey: invitation.templateKey,
        photos,
        guestbookEntries,
        timelinePuzzle
      }
    };
  });
};
