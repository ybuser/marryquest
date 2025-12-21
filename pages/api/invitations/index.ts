import { type NextApiRequest, type NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { title, slug } = req.body ?? {};

  if (!title || !slug) {
    return res.status(400).json({ error: "Title and slug are required." });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const invitation = await prisma.invitation.create({
      data: {
        title,
        slug,
        userId: user.id,
      },
    });

    return res.status(201).json({ id: invitation.id });
  } catch (error) {
    return res.status(409).json({ error: "Slug already exists." });
  }
}
