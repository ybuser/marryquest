import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BarChart3,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock3,
  Copy,
  Ellipsis,
  Eye,
  HelpCircle,
  LayoutGrid,
  LogOut,
  MessageSquare,
  Rocket,
  X,
  type LucideIcon
} from 'lucide-react';
import { LanguageToggle } from '@/components/i18n/LanguageToggle';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import prisma from '@/lib/db';
import { requirePageAuth } from '@/lib/auth';
import { themeTokens } from '@/components/theme/tokens';
import { InvitationPage } from '@/components/invitation/InvitationPage';
import { GuidedWalkthrough, type WalkthroughStep } from '@/components/walkthrough/GuidedWalkthrough';
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

const tabDescriptions: Record<TabKey, string> = {
  Basic: 'Edit couple details, schedule, and invitation style.',
  Sections: 'Configure section order and food vote options.',
  Guestbook: 'Moderate guestbook visibility.',
  Quiz: 'Configure quiz questions and answers.',
  Timeline: 'Build timeline puzzle cards and order.',
  Publish: 'Manage status, slug, and public URL.',
  Export: 'Check RSVP summary and download CSV.'
};

const templateOptions = Object.values(themeTokens);

const KOREAN_SECTION_LABELS: Record<string, string> = {
  hero: '메인',
  info: '기본 안내',
  maps: '오시는 길',
  gallery: '갤러리',
  accounts: '계좌 안내',
  quiz: '퀴즈',
  timeline: '타임라인',
  foodVote: '메뉴 투표',
  guestbook: '방명록',
  rsvp: '참석 여부'
};

const KOREAN_TEMPLATE_TEXT: Record<string, { name: string; concept: string; description: string; recommendedFor: string }> = {
  mono: { name: '모노 미니멀', concept: '미니멀', description: '절제된 타이포 중심의 차분한 분위기로, 군더더기 없이 정돈된 인상을 전합니다.', recommendedFor: '간결하고 차분한 예식 무드를 원할 때' },
  editorial: { name: '에디토리얼 매거진', concept: '클래식', description: '세련된 세리프 타이포와 넓은 여백으로 화보 같은 청첩장 분위기를 만듭니다.', recommendedFor: '사진 중심의 우아한 청첩장을 만들고 싶을 때' },
  film: { name: '필름 스트립', concept: '시네마틱', description: '장면이 이어지는 듯한 구성과 대비감 있는 화면으로 스토리 흐름을 살립니다.', recommendedFor: '추억을 장면처럼 보여주고 싶은 커플에게' },
  bloom: { name: '블룸 팝', concept: '러블리', description: '화사한 색감과 발랄한 포인트가 살아 있어 사랑스럽고 밝은 분위기를 냅니다.', recommendedFor: '귀엽고 생기 있는 웨딩 무드를 원할 때' },
  luxe: { name: '럭스 시그니처', concept: '프리미엄', description: '아이보리와 골드 톤이 중심이 되는 고급스러운 무드로 격식 있는 예식에 잘 어울립니다.', recommendedFor: '호텔 예식이나 클래식한 프리미엄 분위기에' },
  modern: { name: '모던 클린', concept: '모던', description: '읽기 편한 정보 구성과 깔끔한 여백으로 담백하면서 세련된 인상을 줍니다.', recommendedFor: '정보 전달이 또렷한 현대적인 청첩장을 원할 때' },
  hanok: { name: '한옥 무드', concept: '한국적 무드', description: '한국적인 색감과 차분한 결을 살려 단정하고 따뜻한 분위기를 전합니다.', recommendedFor: '한국적인 정서와 모던함을 함께 담고 싶을 때' }
};

interface SortableItemProps {
  section: SectionConfig;
  label: string;
  onToggle: (section: SectionConfig) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: 'up' | 'down') => void;
}

interface SortableTimelineCardProps {
  card: TimelineCardDto;
  onChange: (id: string, updates: Partial<TimelineCardDto>) => void;
  onPhotoUpload: (id: string, file: File) => void;
  uploading: boolean;
  onRemove: (id: string) => void;
  onFocusPreview: (targetId: string) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: 'up' | 'down') => void;
}

interface SortableTimelineOrderItemProps {
  card: TimelineCardDto;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: 'up' | 'down') => void;
}

interface SortableFoodOptionProps {
  option: FoodVoteOptionDto;
  onChange: (id: string, updates: Partial<FoodVoteOptionDto>) => void;
  onRemove: (id: string) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: 'up' | 'down') => void;
}

function MobileMoveControls({
  canMoveUp,
  canMoveDown,
  onMove
}: {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: 'up' | 'down') => void;
}) {
  const { isKorean } = useLanguage();

  return (
    <div className="flex items-center gap-2 lg:hidden">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onMove('up');
        }}
        disabled={!canMoveUp}
        aria-label={isKorean ? '위로 이동' : 'Move up'}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-35"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onMove('down');
        }}
        disabled={!canMoveDown}
        aria-label={isKorean ? '아래로 이동' : 'Move down'}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-35"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}

function SortableItem({ section, label, onToggle, canMoveUp, canMoveDown, onMove }: SortableItemProps) {
  const { isKorean } = useLanguage();
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
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label={isKorean ? '드래그해 순서 바꾸기' : 'Drag to reorder'}
            className="hidden cursor-grab text-slate-500 lg:inline-flex"
            {...attributes}
            {...listeners}
          >
            ::
          </button>
          <span className="font-medium">{label}</span>
        </div>
        <MobileMoveControls canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMove={onMove} />
      </div>
      <button
        type="button"
        onClick={() => onToggle(section)}
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition sm:self-auto ${
          section.enabled
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-slate-100 text-slate-600'
        }`}
      >
        {section.enabled ? (isKorean ? '사용 중' : 'Enabled') : isKorean ? '숨김' : 'Hidden'}
      </button>
    </div>
  );
}

function SortableTimelineCard({
  card,
  onChange,
  onPhotoUpload,
  uploading,
  onRemove,
  onFocusPreview,
  canMoveUp,
  canMoveDown,
  onMove
}: SortableTimelineCardProps) {
  const { isKorean } = useLanguage();
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
      onClick={() => onFocusPreview(`timeline-card-${card.id}`)}
      className="flex cursor-pointer flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-start"
    >
      <div className="flex items-start justify-between gap-3 sm:block">
        <button
          type="button"
          aria-label={isKorean ? '드래그해 순서 바꾸기' : 'Drag to reorder'}
          className="hidden cursor-grab pt-1 text-slate-400 lg:inline-flex"
          {...attributes}
          {...listeners}
        >
          ::
        </button>
        <MobileMoveControls canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMove={onMove} />
      </div>
      <div className="flex-1 space-y-2">
        <input
          value={card.text}
          maxLength={120}
          onFocus={() => onFocusPreview(`timeline-card-${card.id}`)}
          onChange={(event) => onChange(card.id, { text: event.target.value })}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder={isKorean ? '카드 제목' : 'Title'}
        />
        <textarea
          value={card.description ?? ''}
          maxLength={240}
          rows={2}
          onFocus={() => onFocusPreview(`timeline-card-${card.id}`)}
          onChange={(event) => onChange(card.id, { description: event.target.value })}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder={isKorean ? '짧은 설명' : 'Short description'}
        />
        <div className="flex flex-wrap items-center gap-3">
          {card.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={card.photoUrl} alt="" className="h-16 w-16 rounded-md object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-slate-200 text-xs text-slate-400">
              {isKorean ? '사진 없음' : 'No photo'}
            </div>
          )}
          <label className="text-xs font-semibold text-slate-600">
            <span className="rounded-md border border-slate-200 px-3 py-2 shadow-sm hover:bg-slate-50">
              {uploading ? (isKorean ? '업로드 중…' : 'Uploading...') : card.photoUrl ? (isKorean ? '사진 교체' : 'Replace photo') : isKorean ? '사진 업로드' : 'Upload photo'}
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
              onClick={(event) => {
                event.stopPropagation();
                onChange(card.id, { photoUrl: null });
                onFocusPreview(`timeline-card-${card.id}`);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              {isKorean ? '사진 삭제' : 'Remove photo'}
            </button>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove(card.id);
        }}
        className="self-start text-xs font-semibold text-slate-500 hover:text-slate-700"
      >
        {isKorean ? '삭제' : 'Remove'}
      </button>
    </div>
  );
}

function SortableTimelineOrderItem({ card, canMoveUp, canMoveDown, onMove }: SortableTimelineOrderItemProps) {
  const { isKorean } = useLanguage();
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
      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label={isKorean ? '드래그해 순서 바꾸기' : 'Drag to reorder'}
          className="hidden cursor-grab text-slate-400 lg:inline-flex"
          {...attributes}
          {...listeners}
        >
          ::
        </button>
        <span className="font-medium">{card.text || (isKorean ? '제목 없음' : 'Untitled')}</span>
      </div>
      <MobileMoveControls canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMove={onMove} />
    </div>
  );
}


function SortableFoodOption({ option, onChange, onRemove, canMoveUp, canMoveDown, onMove }: SortableFoodOptionProps) {
  const { isKorean } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: option.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-start">
      <div className="flex items-start justify-between gap-3 sm:block">
        <button
          type="button"
          aria-label={isKorean ? '드래그해 순서 바꾸기' : 'Drag to reorder'}
          className="hidden cursor-grab pt-2 text-slate-400 lg:inline-flex"
          {...attributes}
          {...listeners}
        >
          ::
        </button>
        <MobileMoveControls canMoveUp={canMoveUp} canMoveDown={canMoveDown} onMove={onMove} />
      </div>
      <div className="flex-1 space-y-2">
        <input
          value={option.label}
          onChange={(event) => onChange(option.id, { label: event.target.value })}
          maxLength={80}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder={isKorean ? '메뉴 이름' : 'Menu label'}
        />
        <input
          value={option.description ?? ''}
          onChange={(event) => onChange(option.id, { description: event.target.value })}
          maxLength={200}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder={isKorean ? '설명 (선택)' : 'Description (optional)'}
        />
      </div>
      <button type="button" onClick={() => onRemove(option.id)} className="text-xs font-semibold text-slate-500 hover:text-slate-700">
        {isKorean ? '삭제' : 'Remove'}
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
  const { isKorean, language } = useLanguage();
  const tabLabels: Record<TabKey, string> = isKorean
    ? { Basic: '기본 정보', Sections: '섹션', Guestbook: '방명록', Quiz: '퀴즈', Timeline: '타임라인', Publish: '공개 설정', Export: '참석 내역' }
    : { Basic: 'Basic', Sections: 'Sections', Guestbook: 'Guestbook', Quiz: 'Quiz', Timeline: 'Timeline', Publish: 'Publish', Export: 'Export' };
  const mobileTabLabels: Record<TabKey, string> = isKorean
    ? { Basic: '기본', Sections: '구성', Guestbook: '방명록', Quiz: '퀴즈', Timeline: '타임라인', Publish: '공개', Export: '응답' }
    : { Basic: 'Basics', Sections: 'Sections', Guestbook: 'Guests', Quiz: 'Quiz', Timeline: 'Timeline', Publish: 'Publish', Export: 'RSVP' };
  const tabIcons: Record<TabKey, LucideIcon> = {
    Basic: ClipboardList,
    Sections: LayoutGrid,
    Guestbook: MessageSquare,
    Quiz: HelpCircle,
    Timeline: Clock3,
    Publish: Rocket,
    Export: BarChart3
  };
  const tabDescriptionsLocalized: Record<TabKey, string> = isKorean
    ? {
        Basic: '신랑신부 정보와 예식 기본 정보를 정리합니다.',
        Sections: '섹션 순서와 메뉴 투표 구성을 조정합니다.',
        Guestbook: '공개 방명록 메시지를 관리합니다.',
        Quiz: '하객 참여용 퀴즈를 설정합니다.',
        Timeline: '타임라인 퍼즐 카드와 정답 순서를 편집합니다.',
        Publish: '공개 상태, 링크 주소, 삭제를 관리합니다.',
        Export: '참석 응답 요약을 확인하고 CSV로 내려받습니다.'
      }
    : tabDescriptions;
  const sectionLabels: Record<string, string> = isKorean
    ? KOREAN_SECTION_LABELS
    : (Object.fromEntries(DEFAULT_SECTIONS.map((section) => [section.key, section.label])) as Record<string, string>);
  const statusLabels: Record<'draft' | 'published' | 'private', string> = isKorean
    ? { draft: '임시저장', published: '공개', private: '비공개' }
    : { draft: 'draft', published: 'published', private: 'private' };
  const attendanceLabels: Record<'yes' | 'maybe' | 'no', string> = isKorean
    ? { yes: '참석', maybe: '미정', no: '불참' }
    : { yes: 'yes', maybe: 'maybe', no: 'no' };
  const guestbookDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', {
        year: 'numeric',
        month: language === 'ko' ? 'numeric' : 'short',
        day: 'numeric'
      }),
    [language]
  );
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
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
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
  const [previewFocusRequest, setPreviewFocusRequest] = useState<{ targetId: string; requestId: number } | null>(null);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const router = useRouter();

  const lastErrorTimeRef = useRef(0);
  const previewScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const mobilePreviewScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  const focusPreviewTarget = useCallback((targetId: string) => {
    setPreviewFocusRequest({ targetId, requestId: Date.now() + Math.random() });
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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

  useEffect(() => {
    if (activeTab === 'Guestbook' || activeTab === 'Quiz') {
      focusPreviewTarget('section-guestbook');
      return;
    }
    if (activeTab === 'Timeline') {
      focusPreviewTarget('section-timeline');
    }
  }, [activeTab, focusPreviewTarget]);

  useEffect(() => {
    if (!moreMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setMoreMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMoreMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [moreMenuOpen]);

  useEffect(() => {
    if (!mobilePreviewOpen || typeof window === 'undefined') return;

    const originalOverflow = document.body.style.overflow;
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobilePreviewOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobilePreviewOpen(false);
      }
    };

    if (window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [mobilePreviewOpen]);

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
    resetStatus(isKorean ? '저장 중…' : 'Saving...');
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
        showError(isKorean ? '기본 정보를 저장하지 못했습니다.' : 'Failed to save basic details');
        return;
      }

      const updated = await response.json();
      const normalizedDate = updated.dateTime ? new Date(updated.dateTime).toISOString() : draftInvitation.dateTime;
      const next = { ...draftInvitation, ...updated, dateTime: normalizedDate } as InvitationDetails;
      setSavedInvitation((prev) => ({ ...prev, ...next }));
      setDraftInvitation((prev) => ({ ...prev, ...next }));
      resetStatus(isKorean ? '저장됨' : 'Saved');
    } catch (error) {
      console.error(error);
      showError(isKorean ? '기본 정보를 저장하지 못했습니다.' : 'Failed to save basic details');
    } finally {
      setBasicSaving(false);
    }
  }

  async function saveSections() {
    setSectionsSaving(true);
    resetStatus(isKorean ? '저장 중…' : 'Saving...');
    try {
      const response = await fetch(`/api/invitations/${savedInvitation.id}/sections`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: draftSections })
      });

      if (!response.ok) {
        showError(isKorean ? '섹션 구성을 저장하지 못했습니다.' : 'Unable to update sections');
        return;
      }

      const updated: SectionConfig[] = await response.json();
      setSavedSections(updated);
      setDraftSections(updated);
      setSavedInvitation((prev) => ({ ...prev, sections: updated }));
      setDraftInvitation((prev) => ({ ...prev, sections: updated }));
      resetStatus(isKorean ? '저장됨' : 'Saved');
    } catch (error) {
      console.error(error);
      showError(isKorean ? '섹션 구성을 저장하지 못했습니다.' : 'Unable to update sections');
    } finally {
      setSectionsSaving(false);
    }
  }

  async function saveGuestbook() {
    setGuestbookSaving(true);
    resetStatus(isKorean ? '저장 중…' : 'Saving...');

    const updates = draftGuestbookEntries
      .filter((entry, index) => entry.hidden !== savedGuestbookEntries[index]?.hidden)
      .map((entry) => ({ id: entry.id, hidden: entry.hidden }));

    if (updates.length === 0) {
      resetStatus(isKorean ? '저장됨' : 'Saved');
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
        showError(isKorean ? '방명록 설정을 저장하지 못했습니다.' : 'Unable to update guestbook');
        return;
      }

      const refreshed: GuestbookEntryDto[] = await response.json();
      setSavedGuestbookEntries(refreshed);
      setDraftGuestbookEntries(refreshed);
      resetStatus(isKorean ? '저장됨' : 'Saved');
    } catch (error) {
      console.error(error);
      showError(isKorean ? '방명록 설정을 저장하지 못했습니다.' : 'Unable to update guestbook');
    } finally {
      setGuestbookSaving(false);
    }
  }

  function addQuizQuestion() {
    if (draftQuiz.questions.length >= 5) return;
    const nextQuestionIndex = draftQuiz.questions.length;
    setDraftQuiz((prev) => ({
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
    }));
    focusPreviewTarget(`quiz-question-${nextQuestionIndex}`);
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
    if (draftTimeline.cards.length >= 7) return;
    const nextCard = createTimelineCard(draftTimeline.cards.length);
    setDraftTimeline((prev) => ({
      ...prev,
      cards: [...prev.cards, nextCard]
    }));
    focusPreviewTarget(`timeline-card-${nextCard.id}`);
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
    resetStatus(isKorean ? '저장 중…' : 'Saving...');

    const trimmedQuestions = draftQuiz.questions.map((question) => ({
      prompt: question.prompt.trim(),
      options: question.options.map((option) => option.trim()),
      correctIndex: question.correctIndex
    }));

    if (draftQuiz.enabled && trimmedQuestions.length === 0) {
      showError(isKorean ? '퀴즈를 사용하려면 문제를 1개 이상 추가해 주세요.' : 'Add at least one question to enable the quiz');
      setQuizSaving(false);
      return;
    }

    const invalidQuestion = trimmedQuestions.some(
      (question) => !question.prompt || question.options.some((option) => !option)
    );

    if (invalidQuestion) {
      showError(isKorean ? '문제와 보기 내용을 모두 입력해 주세요.' : 'Please fill in all prompts and options');
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
        showError(payload?.error ?? (isKorean ? '퀴즈를 저장하지 못했습니다.' : 'Unable to save quiz'));
        return;
      }

      const updated: QuizDto | null = await response.json();
      const normalizedQuiz = updated ?? { ...EMPTY_QUIZ, invitationId: savedInvitation.id };
      setSavedQuiz(normalizedQuiz);
      setDraftQuiz(normalizedQuiz);
      setSavedInvitation((prev) => ({ ...prev, quiz: normalizedQuiz }));
      setDraftInvitation((prev) => ({ ...prev, quiz: normalizedQuiz }));
      resetStatus(isKorean ? '저장됨' : 'Saved');
    } catch (error) {
      console.error(error);
      showError(isKorean ? '퀴즈를 저장하지 못했습니다.' : 'Unable to save quiz');
    } finally {
      setQuizSaving(false);
    }
  }

  async function saveTimeline() {
    setTimelineSaving(true);
    resetStatus(isKorean ? '저장 중…' : 'Saving...');

    const trimmedCards = draftTimeline.cards.map((card) => ({
      ...card,
      text: card.text.trim(),
      description: card.description?.trim() || null
    }));

    if (draftTimeline.enabled) {
      if (trimmedCards.length < 5 || trimmedCards.length > 7) {
        showError(isKorean ? '타임라인 퍼즐은 카드 5~7장이 필요합니다.' : 'Timeline needs 5 to 7 cards');
        setTimelineSaving(false);
        return;
      }

      if (trimmedCards.some((card) => !card.text)) {
        showError(isKorean ? '타임라인 카드 내용을 모두 입력해 주세요.' : 'Please fill in all timeline cards');
        setTimelineSaving(false);
        return;
      }

      const correctOrders = trimmedCards.map((card) => card.correctOrder);
      const uniqueOrders = new Set(correctOrders);
      if (uniqueOrders.size !== trimmedCards.length) {
        showError(isKorean ? '정답 순서는 중복 없이 설정해 주세요.' : 'Correct order values must be unique');
        setTimelineSaving(false);
        return;
      }
      const maxOrder = Math.max(...correctOrders);
      if (maxOrder >= trimmedCards.length) {
        showError(isKorean ? '정답 순서는 카드 개수 범위 안에서 설정해 주세요.' : 'Correct order values must be within card range');
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
        showError(payload?.error ?? (isKorean ? '타임라인을 저장하지 못했습니다.' : 'Unable to save timeline'));
        return;
      }

      const updated: TimelinePuzzleDto = await response.json();
      setSavedTimeline(updated);
      setDraftTimeline(updated);
      setSavedInvitation((prev) => ({ ...prev, timelinePuzzle: updated }));
      setDraftInvitation((prev) => ({ ...prev, timelinePuzzle: updated }));
      resetStatus(isKorean ? '저장됨' : 'Saved');
    } catch (error) {
      console.error(error);
      showError(isKorean ? '타임라인을 저장하지 못했습니다.' : 'Unable to save timeline');
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
        setTimelineUploadError(payload?.error ?? (isKorean ? '사진을 업로드하지 못했습니다.' : 'Unable to upload photo'));
        return;
      }

      const payload: { url: string } = await response.json();
      updateTimelineCard(cardId, { photoUrl: payload.url });
    } catch (error) {
      console.error(error);
      setTimelineUploadError(isKorean ? '사진을 업로드하지 못했습니다.' : 'Unable to upload photo');
    } finally {
      setTimelineUploadingId(null);
    }
  }

  async function savePublish() {
    setPublishSaving(true);
    resetStatus(isKorean ? '저장 중…' : 'Saving...');

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
          showError(isKorean ? '링크 주소를 저장하지 못했습니다.' : 'Failed to update slug');
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
          showError(isKorean ? '공개 상태를 저장하지 못했습니다.' : 'Unable to update status');
          return;
        }

        const updated = await statusResponse.json();
        setDraftInvitation((prev) => ({ ...prev, status: updated.status }));
        setSavedInvitation((prev) => ({ ...prev, status: updated.status }));
      }

      resetStatus(isKorean ? '저장됨' : 'Saved');
    } catch (error) {
      console.error(error);
      showError(isKorean ? '공개 설정을 저장하지 못했습니다.' : 'Unable to save publish settings');
    } finally {
      setPublishSaving(false);
    }
  }

  async function deleteInvitation() {
    if (!window.confirm(isKorean ? '이 청첩장을 삭제할까요? 삭제 후에는 되돌릴 수 없습니다.' : 'Delete this invitation? This action cannot be undone.')) {
      return;
    }

    setDeleteSaving(true);
    try {
      const response = await fetch(`/api/invitations/${savedInvitation.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? (isKorean ? '청첩장을 삭제하지 못했습니다.' : 'Failed to delete invitation'));
      }

      await router.push('/dashboard');
    } catch (error) {
      console.error(error);
      alert(isKorean ? '청첩장을 삭제하지 못했습니다.' : 'Failed to delete invitation');
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

  function getMoveTargetIndex(currentIndex: number, length: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= length) {
      return null;
    }

    return targetIndex;
  }

  function moveSectionByButton(sectionId: string, direction: 'up' | 'down') {
    const currentIndex = orderedSections.findIndex((section) => section.id === sectionId);
    const targetIndex = getMoveTargetIndex(currentIndex, orderedSections.length, direction);
    if (targetIndex === null) return;

    const nextSections = arrayMove(orderedSections, currentIndex, targetIndex).map((section, index) => ({
      ...section,
      order: index
    }));

    setDraftSections(nextSections);
  }

  function moveFoodVoteOptionByButton(optionId: string, direction: 'up' | 'down') {
    const currentIndex = orderedFoodVoteOptions.findIndex((option) => option.id === optionId);
    const targetIndex = getMoveTargetIndex(currentIndex, orderedFoodVoteOptions.length, direction);
    if (targetIndex === null) return;

    const nextOptions = arrayMove(orderedFoodVoteOptions, currentIndex, targetIndex).map((option, index) => ({
      ...option,
      order: index
    }));

    setDraftFoodVoteOptions(nextOptions);
  }

  function moveTimelineCardByButton(cardId: string, direction: 'up' | 'down') {
    const currentIndex = orderedTimelineCards.findIndex((card) => card.id === cardId);
    const targetIndex = getMoveTargetIndex(currentIndex, orderedTimelineCards.length, direction);
    if (targetIndex === null) return;

    const nextCards = arrayMove(orderedTimelineCards, currentIndex, targetIndex).map((card, index) => ({
      ...card,
      order: index
    }));

    setDraftTimeline((prev) => ({ ...prev, cards: nextCards }));
  }

  function moveCorrectOrderCardByButton(cardId: string, direction: 'up' | 'down') {
    const currentIndex = orderedCorrectCards.findIndex((card) => card.id === cardId);
    const targetIndex = getMoveTargetIndex(currentIndex, orderedCorrectCards.length, direction);
    if (targetIndex === null) return;

    const nextCards = arrayMove(orderedCorrectCards, currentIndex, targetIndex).map((card, index) => ({
      ...card,
      correctOrder: index
    }));

    setDraftTimeline((prev) => ({
      ...prev,
      cards: prev.cards.map((card) => nextCards.find((nextCard) => nextCard.id === card.id) ?? card)
    }));
  }

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
    resetStatus(isKorean ? '저장 중…' : 'Saving...');
    const cleaned = orderedFoodVoteOptions.map((option) => ({
      label: option.label.trim(),
      description: option.description?.trim() || null,
      isActive: true
    }));

    if (cleaned.length < 2 || cleaned.length > 6) {
      showError(isKorean ? '메뉴 투표 항목은 2개 이상 6개 이하로 설정해 주세요.' : 'Food vote options must be between 2 and 6');
      setFoodVoteSaving(false);
      return;
    }

    if (cleaned.some((option) => !option.label)) {
      showError(isKorean ? '메뉴 이름을 모두 입력해 주세요.' : 'Please fill in all food vote labels');
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
        showError(isKorean ? '메뉴 투표 항목을 저장하지 못했습니다.' : 'Unable to save food vote options');
        return;
      }

      const updated: FoodVoteOptionDto[] = await response.json();
      setSavedFoodVoteOptions(updated);
      setDraftFoodVoteOptions(updated);
      setSavedInvitation((prev) => ({ ...prev, foodVoteOptions: updated }));
      setDraftInvitation((prev) => ({ ...prev, foodVoteOptions: updated }));
      resetStatus(isKorean ? '저장됨' : 'Saved');
    } catch (error) {
      console.error(error);
      showError(isKorean ? '메뉴 투표 항목을 저장하지 못했습니다.' : 'Unable to save food vote options');
    } finally {
      setFoodVoteSaving(false);
    }
  }

  function handleGuestbookToggle(entryId: string) {
    setDraftGuestbookEntries((prev) =>
      prev.map((entry) => (entry.id === entryId ? { ...entry, hidden: !entry.hidden } : entry))
    );
  }

  async function deleteGuestbookEntry(entryId: string, nickname: string) {
    const confirmed = window.confirm(
      isKorean
        ? `"${nickname}" 님의 방명록 메시지를 삭제할까요?\n\n삭제 후에는 되돌릴 수 없습니다.`
        : `Delete this guestbook message from "${nickname}"?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    setGuestbookSaving(true);
    resetStatus(isKorean ? '삭제 중…' : 'Deleting...');
    try {
      const response = await fetch(`/api/guestbook/${entryId}`, { method: 'DELETE' });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        showError(payload?.error ?? (isKorean ? '방명록 메시지를 삭제하지 못했습니다.' : 'Unable to delete guestbook entry'));
        return;
      }

      setSavedGuestbookEntries((prev) => prev.filter((entry) => entry.id !== entryId));
      setDraftGuestbookEntries((prev) => prev.filter((entry) => entry.id !== entryId));
      focusPreviewTarget('section-guestbook');
      resetStatus(isKorean ? '삭제됨' : 'Deleted');
    } catch (error) {
      console.error(error);
      showError(isKorean ? '방명록 메시지를 삭제하지 못했습니다.' : 'Unable to delete guestbook entry');
    } finally {
      setGuestbookSaving(false);
    }
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
      setCopyMessage(isKorean ? '복사됨' : 'Copied!');
    } catch (error) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = publishUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopyMessage(isKorean ? '복사됨' : 'Copied!');
      } catch (fallbackError) {
        console.error(fallbackError);
        showError(isKorean ? '링크를 복사하지 못했습니다.' : 'Unable to copy link');
      }
    }
  }

  async function copyBuilderUrl() {
    const builderPath = `/builder/${draftInvitation.slug || draftInvitation.id}`;
    const url = origin ? `${origin}${builderPath}` : builderPath;

    try {
      await navigator.clipboard.writeText(url);
      resetStatus(isKorean ? '빌더 링크를 복사했습니다.' : 'Builder link copied');
      setMoreMenuOpen(false);
    } catch (error) {
      console.error(error);
      showError(isKorean ? '빌더 링크를 복사하지 못했습니다.' : 'Unable to copy builder link');
    }
  }

  const guestbookDate = (value: string) => guestbookDateFormatter.format(new Date(value));

  const guestbookBadgeLabel = (badge: GuestbookEntryDto['badge']) => {
    if (badge === 'none') return null;
    if (badge === 'quizPerfect') return isKorean ? '퀴즈 만점' : 'Quiz Perfect';
    if (badge === 'timelinePerfect') return isKorean ? '타임라인 정답' : 'Timeline Perfect';
    if (badge === 'foodWinner') return isKorean ? '메뉴 투표 픽' : 'Food Winner';
    return badge;
  };

  const unsavedLabel = (tab: TabKey) => {
    const hasChanges =
      tab === 'Basic'
        ? hasBasicChanges
        : tab === 'Sections'
          ? hasSectionsChanges || hasFoodVoteChanges
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
      <span className="text-xs font-medium text-amber-700">{isKorean ? "저장 전 변경사항" : "Unsaved changes"}</span>
    ) : (
      <span className="text-xs text-slate-500">{isKorean ? "저장됨" : "Saved"}</span>
    );
  };

  const tabHasChanges = (tab: TabKey) =>
    tab === 'Basic'
      ? hasBasicChanges
      : tab === 'Sections'
        ? hasSectionsChanges || hasFoodVoteChanges
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
      setDraftFoodVoteOptions(savedFoodVoteOptions);
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

  const activeTabSaving =
    activeTab === 'Basic'
      ? basicSaving
      : activeTab === 'Sections'
        ? sectionsSaving || foodVoteSaving
        : activeTab === 'Guestbook'
          ? guestbookSaving
          : activeTab === 'Quiz'
            ? quizSaving
            : activeTab === 'Timeline'
              ? timelineSaving
              : activeTab === 'Publish'
                ? publishSaving
                : false;

  const saveActiveTab = useCallback(async () => {
    if (activeTab === 'Basic' && hasBasicChanges && !basicSaving) {
      await saveBasic();
      return;
    }

    if (activeTab === 'Sections') {
      if (hasSectionsChanges && !sectionsSaving) {
        await saveSections();
      }
      if (hasFoodVoteChanges && !foodVoteSaving) {
        await saveFoodVoteOptions();
      }
      return;
    }

    if (activeTab === 'Guestbook' && hasGuestbookChanges && !guestbookSaving) {
      await saveGuestbook();
      return;
    }

    if (activeTab === 'Quiz' && hasQuizChanges && !quizSaving) {
      await saveQuiz();
      return;
    }

    if (activeTab === 'Timeline' && hasTimelineChanges && !timelineSaving) {
      await saveTimeline();
      return;
    }

    if (activeTab === 'Publish' && hasPublishChanges && !publishSaving) {
      await savePublish();
    }
  }, [
    activeTab,
    basicSaving,
    foodVoteSaving,
    guestbookSaving,
    hasBasicChanges,
    hasFoodVoteChanges,
    hasGuestbookChanges,
    hasPublishChanges,
    hasQuizChanges,
    hasSectionsChanges,
    hasTimelineChanges,
    publishSaving,
    quizSaving,
    sectionsSaving,
    timelineSaving
  ]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') {
        return;
      }
      event.preventDefault();
      void saveActiveTab();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveActiveTab]);

  const trySwitchTab = (nextTab: TabKey) => {
    if (nextTab === activeTab) return;
    if (!tabHasChanges(activeTab)) {
      setMobilePreviewOpen(false);
      setActiveTab(nextTab);
      return;
    }

    if (window.confirm(isKorean ? '이 탭에 저장되지 않은 수정사항이 있습니다. 버리고 다른 탭으로 이동할까요?' : 'You have unsaved changes in this tab. Discard them and switch tabs?')) {
      discardDraftChanges(activeTab);
      setMobilePreviewOpen(false);
      setActiveTab(nextTab);
    }
  };

  const builderWalkthroughSteps = useMemo<WalkthroughStep[]>(
    () =>
      isKorean
        ? [
            {
              id: 'header',
              title: '청첩장 편집 헤더',
              description: '현재 편집 중인 청첩장의 제목, 링크 주소, 공개 상태를 이곳에서 바로 확인할 수 있습니다.',
              selector: '[data-tour="builder-header"]',
              placement: 'bottom'
            },
            {
              id: 'tabs',
              title: '탭별 편집 흐름',
              description: '기본 정보부터 방명록, 퀴즈, 타임라인, 공개 설정까지 탭 단위로 나누어 관리합니다.',
              selector: '[data-tour="builder-tabs"]',
              placement: 'bottom'
            },
            {
              id: 'tab-actions',
              title: '저장과 되돌리기',
              description: '현재 탭 저장 버튼으로만 실제 반영되며, 필요하면 현재 탭만 되돌릴 수 있습니다.',
              selector: '[data-tour="builder-tab-actions"]',
              placement: 'bottom'
            },
            {
              id: 'editor',
              title: '편집 패널',
              description: '왼쪽 영역에서 내용을 수정합니다. 저장 전까지는 초안 상태로만 유지됩니다.',
              selector: '[data-tour="builder-editor-panel"]',
              placement: 'right'
            },
            {
              id: 'preview',
              title: '실시간 미리보기',
              description: '오른쪽 미리보기는 초안 변경을 즉시 반영하고, 편집한 위치로 자동 이동해 확인하기 쉽습니다.',
              selector: '[data-tour="builder-preview-fab"], [data-tour="builder-preview-panel-desktop"]',
              placement: 'left'
            },
            {
              id: 'more',
              title: '추가 메뉴',
              description: '자주 쓰지만 상단을 복잡하게 만들고 싶지 않은 기능은 이 메뉴에 담겨 있습니다.',
              selector: '[data-tour="builder-more-trigger"]',
              placement: 'bottom'
            },
            {
              id: 'walkthrough-entry',
              title: '가이드 다시 열기',
              description: '처음 사용자 안내가 필요하거나 작업 흐름을 다시 보고 싶을 때 이 메뉴를 사용합니다.',
              selector: '[data-tour="builder-menu-walkthrough"]',
              placement: 'left',
              onEnter: () => setMoreMenuOpen(true)
            }
          ]
        : [
            {
              id: 'header',
              title: 'Builder workspace',
              description: 'This header shows invitation identity, slug, and publication status at a glance.',
              selector: '[data-tour="builder-header"]',
              placement: 'bottom'
            },
            {
              id: 'tabs',
              title: 'Section-based editing',
              description: 'Move across tabs to edit details, sections, moderation, timeline, and publishing.',
              selector: '[data-tour="builder-tabs"]',
              placement: 'bottom'
            },
            {
              id: 'tab-actions',
              title: 'Save discipline',
              description: 'Use Save current tab for explicit writes and Discard current tab to revert tab-level drafts.',
              selector: '[data-tour="builder-tab-actions"]',
              placement: 'bottom'
            },
            {
              id: 'editor',
              title: 'Editing panel',
              description: 'The left panel is your active editor. Inputs change only draft state until saved.',
              selector: '[data-tour="builder-editor-panel"]',
              placement: 'right'
            },
            {
              id: 'preview',
              title: 'Live preview pane',
              description: 'The preview on the right updates from draft values and supports focused auto-scroll.',
              selector: '[data-tour="builder-preview-fab"], [data-tour="builder-preview-panel-desktop"]',
              placement: 'left'
            },
            {
              id: 'more',
              title: 'More actions',
              description: 'Use this menu for advanced tools without crowding the main header.',
              selector: '[data-tour="builder-more-trigger"]',
              placement: 'bottom'
            },
            {
              id: 'walkthrough-entry',
              title: 'Walkthrough command',
              description: 'This command reopens the walkthrough whenever you need onboarding or a refresher.',
              selector: '[data-tour="builder-menu-walkthrough"]',
              placement: 'left',
              onEnter: () => setMoreMenuOpen(true)
            }
          ],
    [isKorean, setMoreMenuOpen]
  );

  return (
    <div className="min-h-screen bg-slate-100/70">
      <Head>
        <title>{isKorean ? '청첩장 편집실' : 'Invitation Builder'} | {draftInvitation.title ?? (isKorean ? '제목 없음' : 'Untitled')}</title>
      </Head>
      <div className="mx-auto max-w-[1280px] px-4 py-4 pb-28 sm:px-6 sm:py-6 sm:pb-32 lg:pb-8 lg:py-8">
        <header data-tour="builder-header" className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{isKorean ? '청첩장 편집실' : 'Invitation Builder'}</p>
              <h1 className="text-xl font-semibold leading-tight text-slate-900 sm:text-2xl">{draftInvitation.title ?? (isKorean ? '제목 없는 청첩장' : 'Untitled invitation')}</h1>
              <p className="text-sm text-slate-600">
                {draftInvitation.groomName} &amp; {draftInvitation.brideName}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{isKorean ? '링크 주소' : 'slug'}: {draftInvitation.slug}</span>
                <span
                  className={`rounded-full px-2.5 py-1 font-semibold uppercase tracking-wide ${
                    draftInvitation.status === 'published'
                      ? 'bg-emerald-100 text-emerald-700'
                      : draftInvitation.status === 'draft'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {statusLabels[draftInvitation.status as 'draft' | 'published' | 'private'] ?? draftInvitation.status}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Link
                href="/dashboard"
                className="order-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto lg:order-none lg:h-10"
              >
                <ChevronLeft className="h-4 w-4 lg:hidden" />
                {isKorean ? '대시보드로' : 'Back to dashboard'}
              </Link>
              <div className="order-2 lg:order-none">
                <LanguageToggle />
              </div>
              {draftInvitation.status === 'published' && draftInvitation.slug && (
                <a
                  data-tour="builder-public-page"
                  href={`/${draftInvitation.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="order-4 inline-flex h-11 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto lg:order-none lg:h-10"
                >
                  {isKorean ? '공개 페이지 보기' : 'View public page'}
                </a>
              )}
              <div ref={moreMenuRef} className="relative order-3 ml-auto lg:order-none lg:ml-0">
                <button
                  type="button"
                  data-tour="builder-more-trigger"
                  onClick={() => setMoreMenuOpen((prev) => !prev)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 lg:h-10 lg:w-10"
                  aria-expanded={moreMenuOpen}
                  aria-label={isKorean ? "추가 메뉴" : "More actions"}
                >
                  <Ellipsis className="h-5 w-5" />
                </button>
                {moreMenuOpen && (
                  <div className="absolute right-0 z-20 mt-2 min-w-[220px] rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                    <button
                      type="button"
                      data-tour="builder-menu-walkthrough"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setWalkthroughOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <HelpCircle className="h-4 w-4 text-cyan-600" />
                      {isKorean ? '사용 가이드 보기' : 'Start walkthrough'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void copyBuilderUrl();
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <Copy className="h-4 w-4 text-slate-500" />
                      {isKorean ? '빌더 링크 복사' : 'Copy builder link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        void signOut({ callbackUrl: '/login' });
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <LogOut className="h-4 w-4 text-slate-500" />
                      {isKorean ? '로그아웃' : 'Sign out'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div data-tour="builder-tabs" className="mt-5">
            <div className="grid grid-cols-4 gap-2 lg:hidden">
              {tabs.map((tab) => {
                const TabIcon = tabIcons[tab];
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => trySwitchTab(tab)}
                    className={`flex min-h-[86px] flex-col justify-between rounded-2xl border px-3 py-3 text-left transition ${
                      activeTab === tab
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                      activeTab === tab ? 'bg-white/10 text-white' : 'bg-white text-slate-700'
                    }`}>
                      <TabIcon className="h-4 w-4" />
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold leading-tight">{mobileTabLabels[tab]}</span>
                      {tabHasChanges(tab) && (
                        <span className={`h-1.5 w-1.5 rounded-full ${activeTab === tab ? 'bg-amber-300' : 'bg-amber-500'}`} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="hidden gap-2 overflow-x-auto pb-1 lg:flex">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                    activeTab === tab
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => trySwitchTab(tab)}
                >
                  <span>{tabLabels[tab]}</span>
                  {tabHasChanges(tab) && (
                    <span className={`h-1.5 w-1.5 rounded-full ${activeTab === tab ? 'bg-amber-300' : 'bg-amber-500'}`} />
                  )}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 hidden text-sm text-slate-600 lg:block">{tabDescriptionsLocalized[activeTab]} {isKorean ? 'Ctrl/Cmd + S로 현재 탭을 저장할 수 있습니다.' : 'Press Ctrl/Cmd + S to save current tab.'}</p>
        </header>

        <div data-tour="builder-tab-actions" className="mt-4 space-y-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{isKorean ? '현재 단계' : 'Current step'}</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{tabLabels[activeTab]}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{tabDescriptionsLocalized[activeTab]}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                tabHasChanges(activeTab)
                  ? 'bg-amber-100 text-amber-700'
                  : activeTab === 'Export'
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-emerald-100 text-emerald-700'
              }`}>
                {tabHasChanges(activeTab) ? (isKorean ? '저장 필요' : 'Needs save') : activeTab === 'Export' ? (isKorean ? '읽기 전용' : 'Read only') : isKorean ? '저장됨' : 'Saved'}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Eye className="h-4 w-4" />
                <span>{isKorean ? '미리보기는 화면 오른쪽 아래 버튼에서 열 수 있어요.' : 'Open preview from the floating button at the bottom right.'}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {isKorean ? '편집 위치는 그대로 두고, 미리보기만 별도 시트로 열려서 작은 화면에서도 흐름이 끊기지 않습니다.' : 'Your editor stays in place while preview opens in its own sheet for small screens.'}
              </p>
            </div>

            {statusMessage ? (
              <div
                className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                  /fail|unable|error|못했습니다|실패|오류/i.test(statusMessage)
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : /saved|deleted|copied|저장됨|삭제됨|복사/i.test(statusMessage)
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                {statusMessage}
              </div>
            ) : (
              <p className="mt-4 text-xs leading-5 text-slate-500">
                {isKorean ? '저장은 아래 고정 바에서 빠르게 처리하고, 미리보기는 우측 하단 버튼으로 언제든 열어 확인할 수 있습니다.' : 'Save from the fixed bar below, and open preview anytime from the floating button.'}
              </p>
            )}
          </div>

          <div className="hidden flex-col gap-3 lg:flex lg:flex-row lg:items-center lg:justify-between">
            {statusMessage ? (
              <div
                className={`rounded-xl border px-4 py-2.5 text-sm ${
                  /fail|unable|error|못했습니다|실패|오류/i.test(statusMessage)
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : /saved|deleted|copied|저장됨|삭제됨|복사/i.test(statusMessage)
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                {statusMessage}
              </div>
            ) : (
              <div className="text-sm text-slate-500">{isKorean ? '현재 탭의 변경사항은 저장 버튼을 눌러야 실제로 반영됩니다.' : 'All changes in the current tab must be saved manually.'}</div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => discardDraftChanges(activeTab)}
                disabled={!tabHasChanges(activeTab)}
                className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {isKorean ? '현재 탭 되돌리기' : 'Discard current tab'}
              </button>
              <button
                type="button"
                onClick={() => {
                  void saveActiveTab();
                }}
                disabled={!tabHasChanges(activeTab) || activeTabSaving || activeTab === 'Export'}
                className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {activeTabSaving ? (isKorean ? '저장 중…' : 'Saving...') : isKorean ? '현재 탭 저장' : 'Save current tab'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-6 lg:flex-row">
          <div
            data-tour="builder-editor-panel"
            className="w-full space-y-4 lg:w-[52%]"
          >

          {activeTab === 'Basic' && (
            <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {unsavedLabel('Basic')}
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={saveBasic}
                  disabled={!hasBasicChanges || basicSaving}
                >
                  {basicSaving ? (isKorean ? '저장 중…' : 'Saving...') : isKorean ? '기본 정보 저장' : 'Save Basic'}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  {isKorean ? '신랑 이름' : 'Groom name'}
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.groomName}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, groomName: e.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  {isKorean ? '신부 이름' : 'Bride name'}
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.brideName}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, brideName: e.target.value }))}
                  />
                </label>
              </div>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                {isKorean ? '예식 일시' : 'Wedding date & time'}
                <input
                  type="datetime-local"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={draftInvitation.dateTime.slice(0, 16)}
                  onChange={(e) =>
                    setDraftInvitation((prev) => ({ ...prev, dateTime: new Date(e.target.value).toISOString() }))
                  }
                />
              </label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  {isKorean ? '예식장명' : 'Venue name'}
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.venueName}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, venueName: e.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  {isKorean ? '주소' : 'Address'}
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.address}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, address: e.target.value }))}
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  {isKorean ? '신랑측 계좌' : 'Accounts (groom)'}
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.accountGroom ?? ''}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, accountGroom: e.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  {isKorean ? '신부측 계좌' : 'Accounts (bride)'}
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.accountBride ?? ''}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, accountBride: e.target.value }))}
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  {isKorean ? '신랑측 연락처' : 'Contacts (groom)'}
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.contactGroom ?? ''}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, contactGroom: e.target.value }))}
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  {isKorean ? '신부측 연락처' : 'Contacts (bride)'}
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={draftInvitation.contactBride ?? ''}
                    onChange={(e) => setDraftInvitation((prev) => ({ ...prev, contactBride: e.target.value }))}
                  />
                </label>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{isKorean ? "템플릿" : "Template"}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {templateOptions.map((template) => (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => setDraftInvitation((prev) => ({ ...prev, templateKey: template.key as any }))}
                      className={`rounded-xl border p-4 text-left shadow-sm transition ${
                        draftInvitation.templateKey === template.key
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{isKorean ? KOREAN_TEMPLATE_TEXT[template.key as keyof typeof KOREAN_TEMPLATE_TEXT].name : template.name}</p>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                            draftInvitation.templateKey === template.key
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isKorean ? KOREAN_TEMPLATE_TEXT[template.key as keyof typeof KOREAN_TEMPLATE_TEXT].concept : template.concept}
                        </span>
                      </div>
                      <p className={`mt-2 text-xs leading-relaxed ${draftInvitation.templateKey === template.key ? 'text-slate-100/90' : 'text-slate-600'}`}>
                        {isKorean ? KOREAN_TEMPLATE_TEXT[template.key as keyof typeof KOREAN_TEMPLATE_TEXT].description : template.description}
                      </p>
                      <p className={`mt-2 text-xs ${draftInvitation.templateKey === template.key ? 'text-slate-200/90' : 'text-slate-500'}`}>
                        {isKorean ? '추천 분위기' : 'Best for'}: {isKorean ? KOREAN_TEMPLATE_TEXT[template.key as keyof typeof KOREAN_TEMPLATE_TEXT].recommendedFor : template.recommendedFor}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Sections' && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {unsavedLabel('Sections')}
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={saveSections}
                  disabled={!hasSectionsChanges || sectionsSaving}
                >
                  {sectionsSaving ? (isKorean ? '저장 중…' : 'Saving...') : isKorean ? '섹션 저장' : 'Save Sections'}
                </button>
              </div>
              <p className="text-sm text-slate-700">{isKorean ? '데스크톱에서는 드래그로, 모바일에서는 화살표 버튼으로 섹션 순서를 바꿀 수 있습니다.' : 'Drag to reorder on desktop, or use arrow buttons on mobile.'}</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={orderedSections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {orderedSections.map((section) => (
                      <SortableItem
                        key={section.id}
                        section={section}
                        label={sectionLabels[section.key] ?? section.key}
                        onToggle={handleToggle}
                        canMoveUp={orderedSections.findIndex((item) => item.id === section.id) > 0}
                        canMoveDown={orderedSections.findIndex((item) => item.id === section.id) < orderedSections.length - 1}
                        onMove={(direction) => moveSectionByButton(section.id, direction)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <div className="mt-6 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{isKorean ? '식사 메뉴 투표' : 'Food vote options'}</p>
                    <p className="text-xs text-slate-600">{isKorean ? '메뉴는 2개부터 6개까지 만들 수 있고, 모바일에서는 화살표 버튼으로 순서를 정리할 수 있습니다.' : 'Create 2 to 6 options and use arrow buttons on mobile to reorder them.'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={addFoodVoteOption} disabled={orderedFoodVoteOptions.length >= 6} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">{isKorean ? "항목 추가" : "Add option"}</button>
                    <button type="button" onClick={saveFoodVoteOptions} disabled={!hasFoodVoteChanges || foodVoteSaving} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{foodVoteSaving ? (isKorean ? "저장 중…" : "Saving...") : isKorean ? "메뉴 투표 저장" : "Save food vote"}</button>
                  </div>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFoodVoteDragEnd}>
                  <SortableContext items={orderedFoodVoteOptions.map((option) => option.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {orderedFoodVoteOptions.map((option) => (
                        <SortableFoodOption
                          key={option.id}
                          option={option}
                          onChange={updateFoodVoteOption}
                          onRemove={removeFoodVoteOption}
                          canMoveUp={orderedFoodVoteOptions.findIndex((item) => item.id === option.id) > 0}
                          canMoveDown={orderedFoodVoteOptions.findIndex((item) => item.id === option.id) < orderedFoodVoteOptions.length - 1}
                          onMove={(direction) => moveFoodVoteOptionByButton(option.id, direction)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )}

          {activeTab === 'Guestbook' && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {unsavedLabel('Guestbook')}
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={saveGuestbook}
                  disabled={!hasGuestbookChanges || guestbookSaving}
                >
                  {guestbookSaving ? (isKorean ? '저장 중…' : 'Saving...') : isKorean ? '변경사항 저장' : 'Save changes'}
                </button>
              </div>
              <p className="text-sm text-slate-700">{isKorean ? '공개 방명록에 보여줄지 숨길지 정리하고, 원치 않는 메시지는 삭제할 수 있습니다.' : 'Toggle visibility or delete messages from the public guestbook.'}</p>
              <div className="space-y-3">
                {draftGuestbookEntries.length === 0 && (
                  <p className="text-sm text-slate-600">{isKorean ? '아직 등록된 방명록 메시지가 없습니다.' : 'No guestbook entries yet.'}</p>
                )}
                {draftGuestbookEntries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => focusPreviewTarget(`guestbook-entry-${entry.id}`)}
                    className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm transition hover:border-slate-300 hover:bg-slate-100/70"
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
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleGuestbookToggle(entry.id);
                            focusPreviewTarget(`guestbook-entry-${entry.id}`);
                          }}
                          disabled={guestbookSaving}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition disabled:opacity-50 ${
                            entry.hidden
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {entry.hidden ? (isKorean ? '숨김' : 'Hidden') : isKorean ? '노출 중' : 'Visible'}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteGuestbookEntry(entry.id, entry.nickname);
                          }}
                          disabled={guestbookSaving}
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          {isKorean ? '삭제' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Quiz' && (
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {unsavedLabel('Quiz')}
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={saveQuiz}
                  disabled={!hasQuizChanges || quizSaving}
                >
                  {quizSaving ? (isKorean ? '저장 중…' : 'Saving...') : isKorean ? '퀴즈 저장' : 'Save Quiz'}
                </button>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{isKorean ? '퀴즈 사용' : 'Enable quiz'}</p>
                  <p className="text-xs text-slate-600">{isKorean ? '청첩장을 공개한 뒤에만 하객에게 퀴즈가 노출됩니다.' : 'Guests will only see the quiz once this invitation is published.'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDraftQuiz((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                    draftQuiz.enabled
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-slate-100 text-slate-600'
                  }`}
                >
                  {draftQuiz.enabled ? (isKorean ? '사용 중' : 'Enabled') : isKorean ? '사용 안 함' : 'Disabled'}
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">{isKorean ? '문제 목록' : 'Questions'}</h3>
                    <p className="text-xs text-slate-600">{isKorean ? '문제는 최대 5개까지 만들 수 있고, 각 문제는 보기 4개로 구성됩니다.' : 'Add up to 5 questions with exactly 4 options each.'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={addQuizQuestion}
                    disabled={draftQuiz.questions.length >= 5 || quizSaving}
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {isKorean ? '문제 추가' : 'Add question'}
                  </button>
                </div>

                {draftQuiz.questions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-700">
                    {isKorean ? '먼저 첫 문제를 추가해 주세요. 퀴즈 내용은 저장 버튼을 눌러야 반영됩니다.' : 'Start by adding your first question. Quiz changes are only saved when you click Save Quiz.'}
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
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <span>{isKorean ? '문제 문구' : 'Prompt'}</span>
                              <span className="text-xs text-slate-500">{question.prompt.length}/120</span>
                            </div>
                            <input
                              maxLength={120}
                              value={question.prompt}
                              onFocus={() => focusPreviewTarget(`quiz-question-${questionIndex}`)}
                              onChange={(e) =>
                                updateQuizQuestion(questionIndex, {
                                  prompt: e.target.value,
                                  order: questionIndex
                                })
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2"
                              placeholder={isKorean ? '예: 처음 먼저 연락한 사람은 누구였을까요?' : 'e.g. Who met first?'}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeQuizQuestion(questionIndex)}
                            disabled={quizSaving}
                            className="self-start rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                          >
                            {isKorean ? '삭제' : 'Remove'}
                          </button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          {question.options.map((option, optionIndex) => (
                            <label key={optionIndex} className="space-y-1 text-sm font-medium text-slate-700">
                              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                                <span>{isKorean ? `보기 ${optionIndex + 1}` : `Option ${optionIndex + 1}`}</span>
                                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                                  <input
                                    type="radio"
                                    name={`correct-${questionIndex}`}
                                    checked={question.correctIndex === optionIndex}
                                    onFocus={() => focusPreviewTarget(`quiz-question-${questionIndex}`)}
                                    onChange={() =>
                                      updateQuizQuestion(questionIndex, { correctIndex: optionIndex })
                                    }
                                  />
                                  {isKorean ? '정답' : 'Correct'}
                                </span>
                              </div>
                              <input
                                maxLength={120}
                                value={option}
                                onFocus={() => focusPreviewTarget(`quiz-question-${questionIndex}`)}
                                onChange={(e) => updateQuizOption(questionIndex, optionIndex, e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                                placeholder={isKorean ? `보기 ${optionIndex + 1}` : `Option ${optionIndex + 1}`}
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
            <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {unsavedLabel('Timeline')}
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={saveTimeline}
                  disabled={!hasTimelineChanges || timelineSaving}
                >
                  {timelineSaving ? (isKorean ? '저장 중…' : 'Saving...') : isKorean ? '타임라인 저장' : 'Save Timeline'}
                </button>
              </div>
              <div className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{isKorean ? '타임라인 퍼즐 사용' : 'Enable timeline puzzle'}</p>
                  <p className="text-xs text-slate-600">{isKorean ? '청첩장을 공개하면 하객이 타임라인 퍼즐을 볼 수 있습니다.' : 'Guests will only see the timeline after publishing.'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDraftTimeline((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                    draftTimeline.enabled
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-slate-100 text-slate-600'
                  }`}
                >
                  {draftTimeline.enabled ? (isKorean ? '사용 중' : 'Enabled') : isKorean ? '사용 안 함' : 'Disabled'}
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">{isKorean ? '타임라인 카드' : 'Timeline cards'}</h3>
                    <p className="text-xs text-slate-600">{isKorean ? '하객이 순서를 맞춰 볼 수 있도록 순간 카드 5~7장을 구성해 주세요.' : 'Add 5-7 moments for guests to reorder.'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={addTimelineCard}
                    disabled={draftTimeline.cards.length >= 7}
                    className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                  >
                    {isKorean ? '카드 추가' : 'Add card'}
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
                          onFocusPreview={focusPreviewTarget}
                          canMoveUp={orderedTimelineCards.findIndex((item) => item.id === card.id) > 0}
                          canMoveDown={orderedTimelineCards.findIndex((item) => item.id === card.id) < orderedTimelineCards.length - 1}
                          onMove={(direction) => moveTimelineCardByButton(card.id, direction)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                {timelineUploadError && <p className="text-xs text-red-600">{timelineUploadError}</p>}
                {draftTimeline.enabled && draftTimeline.cards.length < 5 && (
                  <p className="text-xs text-amber-600">{isKorean ? '퍼즐을 사용하려면 카드가 최소 5장 필요합니다.' : 'Add at least 5 cards to enable the puzzle.'}</p>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{isKorean ? '정답 순서' : 'Correct order'}</h3>
                  <p className="text-xs text-slate-600">{isKorean ? '정답 순서는 데스크톱에서 드래그하거나, 모바일에서는 화살표 버튼으로 맞춰 주세요.' : 'Set the correct sequence by dragging on desktop or using arrow buttons on mobile.'}</p>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCorrectOrderDragEnd}>
                  <SortableContext items={orderedCorrectCards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {orderedCorrectCards.map((card) => (
                        <SortableTimelineOrderItem
                          key={card.id}
                          card={card}
                          canMoveUp={orderedCorrectCards.findIndex((item) => item.id === card.id) > 0}
                          canMoveDown={orderedCorrectCards.findIndex((item) => item.id === card.id) < orderedCorrectCards.length - 1}
                          onMove={(direction) => moveCorrectOrderCardByButton(card.id, direction)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )}

          {activeTab === 'Publish' && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {unsavedLabel('Publish')}
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={savePublish}
                  disabled={!hasPublishChanges || publishSaving}
                >
                  {publishSaving ? (isKorean ? '저장 중…' : 'Saving...') : isKorean ? '공개 설정 저장' : 'Save Publish'}
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800">{isKorean ? '공개 상태' : 'Status'}</p>
                <div className="flex gap-2">
                  {['draft', 'published', 'private'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setDraftInvitation((prev) => ({ ...prev, status: status as any }))}
                      className={`rounded-lg border px-3 py-2 text-sm capitalize shadow-sm ${
                        draftInvitation.status === status ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200'
                      }`}
                    >
                      {statusLabels[status as 'draft' | 'published' | 'private'] ?? status}
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isKorean ? '공개 링크' : 'Public URL'}</p>
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
                        {isKorean ? '복사' : 'Copy'}
                      </button>
                    </div>
                    {copyMessage && <p className="text-xs text-emerald-600">{copyMessage}</p>}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800">{isKorean ? '삭제' : 'Danger zone'}</p>
                <button
                  type="button"
                  onClick={deleteInvitation}
                  disabled={deleteSaving}
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:opacity-50"
                >
                  {deleteSaving ? (isKorean ? '삭제 중…' : 'Deleting...') : isKorean ? '청첩장 삭제' : 'Delete invitation'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'Export' && (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <p className="text-base font-semibold text-slate-900">{isKorean ? '참석 응답 요약' : 'RSVP Summary'}</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">{isKorean ? '현재까지 접수된 참석 응답을 빠르게 확인할 수 있습니다.' : 'Quick attendance snapshot'}</p>
              </div>
              <a
                href={`/api/export/rsvp.csv?invitationId=${savedInvitation.id}`}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm"
              >
                {isKorean ? 'CSV 내려받기' : 'Download CSV'}
              </a>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{isKorean ? '응답 수' : 'Total Responses'}</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {rsvpSummary ? rsvpSummary.totals.responsesTotal : rsvpLoading ? '...' : '0'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{isKorean ? '동반 인원' : 'Guests'}</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {rsvpSummary ? rsvpSummary.totals.guestsTotal : rsvpLoading ? '...' : '0'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{isKorean ? '아동 인원' : 'Kids'}</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {rsvpSummary ? rsvpSummary.totals.kidsTotal : rsvpLoading ? '...' : '0'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{isKorean ? '최근 응답 샘플' : 'Recent Samples'}</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {rsvpSummary ? rsvpSummary.recentSampleCount ?? 0 : rsvpLoading ? '...' : '0'}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {(['yes', 'maybe', 'no'] as const).map((key) => (
                  <div key={key} className="rounded-lg border border-slate-100 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{attendanceLabels[key]}</p>
                    <p className="text-2xl font-semibold text-slate-900">
                      {rsvpSummary ? rsvpSummary.countsByAttendance[key] : rsvpLoading ? '...' : '0'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          data-tour="builder-preview-fab"
          onClick={() => setMobilePreviewOpen(true)}
          className={`fixed right-4 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(15,23,42,0.28)] transition hover:bg-slate-800 lg:hidden ${
            activeTab !== 'Export'
              ? 'bottom-[calc(env(safe-area-inset-bottom)+6.25rem)]'
              : 'bottom-[calc(env(safe-area-inset-bottom)+1rem)]'
          }`}
        >
          <Eye className="h-4 w-4" />
          {isKorean ? '미리보기' : 'Preview'}
        </button>

        <div data-tour="builder-preview-panel-desktop" className="hidden w-full lg:block lg:w-[48%]">
          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 lg:sticky lg:top-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">{isKorean ? '실시간 미리보기' : 'Live preview'}</p>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                {isKorean ? '초안' : 'Draft'}
              </span>
            </div>
            <div
              ref={previewScrollContainerRef}
              className="h-[calc(100vh-7.5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-slate-100 bg-slate-50/30"
            >
              <InvitationPage
                invitation={draftInvitation}
                sections={orderedSections}
                photos={photos}
                quiz={draftQuiz}
                timelinePuzzle={draftTimeline}
                previewGuestbookEntries={draftGuestbookEntries}
                previewMode
                previewFocusRequest={previewFocusRequest}
                previewScrollContainerRef={previewScrollContainerRef}
                foodVoteOptions={draftFoodVoteOptions}
              />
            </div>
          </div>
        </div>
      </div>

      {mobilePreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[1px] lg:hidden">
          <button
            type="button"
            aria-label={isKorean ? '미리보기 닫기' : 'Close preview'}
            className="absolute inset-0"
            onClick={() => setMobilePreviewOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[88svh] overflow-hidden rounded-t-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 pb-3 pt-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{isKorean ? '실시간 미리보기' : 'Live preview'}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {isKorean ? '편집 화면은 그대로 두고, 초안 상태를 바로 확인할 수 있어요.' : 'Check the draft without losing your place in the editor.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobilePreviewOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div
              ref={mobilePreviewScrollContainerRef}
              className="h-[min(72svh,calc(100vh-9rem))] overflow-y-auto overscroll-contain bg-slate-50/40 px-3 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-3"
            >
              <InvitationPage
                invitation={draftInvitation}
                sections={orderedSections}
                photos={photos}
                quiz={draftQuiz}
                timelinePuzzle={draftTimeline}
                previewGuestbookEntries={draftGuestbookEntries}
                previewMode
                previewFocusRequest={previewFocusRequest}
                previewScrollContainerRef={mobilePreviewScrollContainerRef}
                foodVoteOptions={draftFoodVoteOptions}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'Export' && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 backdrop-blur lg:hidden">
          <div className="mx-auto max-w-[1280px]">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <span>{tabLabels[activeTab]}</span>
              <span>{tabHasChanges(activeTab) ? (isKorean ? '저장 필요' : 'Needs save') : isKorean ? '저장됨' : 'Saved'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => discardDraftChanges(activeTab)}
                disabled={!tabHasChanges(activeTab)}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {isKorean ? '되돌리기' : 'Discard'}
              </button>
              <button
                type="button"
                onClick={() => {
                  void saveActiveTab();
                }}
                disabled={!tabHasChanges(activeTab) || activeTabSaving}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {activeTabSaving ? (isKorean ? '저장 중…' : 'Saving...') : isKorean ? '저장하기' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <GuidedWalkthrough
        open={walkthroughOpen}
        title={isKorean ? "빌더 가이드" : "Builder Guide"}
        subtitle={isKorean ? "편집, 미리보기, 공개 설정 흐름을 빠르게 둘러봅니다." : "A fast tour of editing, preview, and publishing controls."}
        steps={builderWalkthroughSteps}
        onClose={() => {
          setWalkthroughOpen(false);
          setMoreMenuOpen(false);
        }}
      />
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



