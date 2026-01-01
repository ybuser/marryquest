import { GetServerSideProps } from 'next';
import Head from 'next/head';
import prisma from '@/lib/db';
import { InvitationView } from '@/components/invitation/InvitationView';
import { DEFAULT_SECTIONS, InvitationDetails } from '@/types/invitation';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

interface InvitationPageProps {
  invitation: InvitationDetails;
  templateKey: string;
}

export default function InvitationPage({ invitation, templateKey }: InvitationPageProps) {
  return (
    <ThemeProvider templateKey={templateKey as any}>
      <Head>
        <title>{invitation.title ?? 'Wedding Invitation'}</title>
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <InvitationView invitation={invitation} />
      </main>
    </ThemeProvider>
  );
}

export const getServerSideProps: GetServerSideProps<InvitationPageProps> = async (context) => {
  const slug = context.params?.slug as string;

  const invitation = await prisma.invitation.findUnique({
    where: { slug },
    include: {
      sections: true
    }
  });

  if (!invitation || invitation.status === 'draft' || invitation.status === 'private') {
    return { notFound: true };
  }

  const normalizedSections = invitation.sections.length
    ? invitation.sections
    : DEFAULT_SECTIONS.map((section, index) => ({
        id: `${invitation.id}-${section.key}`,
        key: section.key,
        enabled: true,
        order: index
      }));

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
    sections: normalizedSections
  };

  return {
    props: {
      invitation: invitationDetails,
      templateKey: invitation.templateKey
    }
  };
};
