import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import prisma from '@/lib/db';
import { InvitationPage } from '@/components/invitation/InvitationPage';
import type { GalleryPhoto, InvitationDetails, SectionConfig } from '@/types/invitation';
import { DEFAULT_SECTIONS } from '@/types/invitation';
import type { QuizDto } from '@/types/quiz';
import type { TimelinePuzzleDto } from '@/types/timeline';

interface PublicInvitationPageProps {
  invitation: InvitationDetails;
  sections: SectionConfig[];
  photos: GalleryPhoto[];
  templateKey: string;
  quiz: QuizDto | null;
  timelinePuzzle: TimelinePuzzleDto | null;
  baseUrl: string;
}

export default function PublicInvitationPage({ invitation, sections, photos, baseUrl, quiz, timelinePuzzle }: PublicInvitationPageProps) {
  const date = new Date(invitation.dateTime);
  const description = `${invitation.venueName} · ${format(date, 'PPP', { locale: ko })} 결혼식 안내`;
  const fallbackOg = `${baseUrl}/api/og?title=${encodeURIComponent(`${invitation.groomName} & ${invitation.brideName}`)}&subtitle=${encodeURIComponent(format(date, 'PPP', { locale: ko }))}`;
  const ogImage = photos[0]?.url ?? fallbackOg;

  return (
    <>
      <Head>
        <title>
          {invitation.groomName} &amp; {invitation.brideName} | 모바일 청첩장
        </title>
        <meta name="description" content={description} />
        <meta property="og:title" content={`${invitation.groomName} & ${invitation.brideName} | 모바일 청첩장`} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={ogImage} />
      </Head>
      <InvitationPage invitation={invitation} sections={sections} photos={photos} quiz={quiz} timelinePuzzle={timelinePuzzle} foodVoteOptions={invitation.foodVoteOptions ?? []} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PublicInvitationPageProps> = async (context) => {
  const slug = context.params?.slug as string;
  const host = context.req.headers.host ?? 'localhost:3000';
  const protocolHeader = context.req.headers['x-forwarded-proto'];
  const protocol = Array.isArray(protocolHeader)
    ? protocolHeader[0]
    : protocolHeader ?? (host.includes('localhost') ? 'http' : 'https');
  const baseUrl = `${protocol}://${host}`;

  const invitation = await prisma.invitation.findFirst({
    where: { slug, deletedAt: null },
    include: {
      sections: true,
      galleryPhotos: true,
      quiz: { include: { questions: { orderBy: { order: 'asc' } } } },
      timelinePuzzle: { include: { cards: { orderBy: { order: 'asc' } } } },
      foodVoteOptions: { orderBy: { order: 'asc' } }
    }
  });

  if (!invitation || invitation.status !== 'published') {
    return { notFound: true };
  }

  const normalizedSections: SectionConfig[] = (invitation.sections.length ? invitation.sections : DEFAULT_SECTIONS.map((section, index) => ({
    id: `${invitation.id}-${section.key}`,
    key: section.key,
    enabled: section.key === 'quiz' || section.key === 'timeline' || section.key === 'foodVote' ? false : true,
    order: index
  }))).sort((a, b) => a.order - b.order);

  const photos: GalleryPhoto[] = invitation.galleryPhotos
    .map((photo) => ({
      id: photo.id,
      url: photo.url,
      caption: photo.caption,
      order: photo.order
    }))
    .sort((a, b) => a.order - b.order);

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
    : null;

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
    : null;

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
      sections: normalizedSections,
      photos,
      templateKey: invitation.templateKey,
      quiz,
      timelinePuzzle,
      baseUrl
    }
  };
};
