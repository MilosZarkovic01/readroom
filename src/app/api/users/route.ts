import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPeopleSuggestions } from "@/lib/people-recommendations";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const users = await getPeopleSuggestions(session.user.id, query);
  return NextResponse.json({ users });
}
