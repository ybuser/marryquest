import { type GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../pages/api/auth/[...nextauth]";
import { prisma } from "./db";

export async function requireUser(context: GetServerSidePropsContext) {
  const session = await getServerSession(
    context.req,
    context.res,
    authOptions,
  );

  if (!session?.user?.email) {
    return null;
  }

  return session;
}

export async function assertInvitationOwner(
  invitationId: string,
  userId: string,
) {
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, userId },
    select: { id: true },
  });

  return Boolean(invitation);
}
