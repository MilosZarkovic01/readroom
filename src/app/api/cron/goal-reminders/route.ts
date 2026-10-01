import { NextResponse } from "next/server";
import { sendDueGoalReminders } from "@/lib/send-goal-reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendDueGoalReminders();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Goal reminder cron failed", error);
    return NextResponse.json({ error: "Could not send goal reminders." }, { status: 500 });
  }
}
