export type GoalReminderSettings = {
  enabled: boolean;
  dailyLeadHours: number;
  weeklyLeadHours: number;
  totalLeadHours: number;
};

export const DEFAULT_GOAL_REMINDER_SETTINGS: GoalReminderSettings = {
  enabled: true,
  dailyLeadHours: 3,
  weeklyLeadHours: 24,
  totalLeadHours: 48,
};

const LIMITS = {
  dailyLeadHours: [1, 12],
  weeklyLeadHours: [1, 72],
  totalLeadHours: [1, 24 * 14],
} as const;

function hours(value: string | undefined, fallback: number, min: number, max: number) {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const whole = Math.floor(parsed);
  if (whole < min || whole > max) return fallback;
  return whole;
}

/** Reads reminder timing from the environment. Invalid values fall back to the defaults. */
export function goalReminderSettings(
  env: Record<string, string | undefined> = process.env,
): GoalReminderSettings {
  const enabled = !["false", "0", "off"].includes((env.GOAL_REMINDER_ENABLED ?? "").trim().toLowerCase());
  return {
    enabled,
    dailyLeadHours: hours(
      env.GOAL_REMINDER_DAILY_LEAD_HOURS,
      DEFAULT_GOAL_REMINDER_SETTINGS.dailyLeadHours,
      LIMITS.dailyLeadHours[0],
      LIMITS.dailyLeadHours[1],
    ),
    weeklyLeadHours: hours(
      env.GOAL_REMINDER_WEEKLY_LEAD_HOURS,
      DEFAULT_GOAL_REMINDER_SETTINGS.weeklyLeadHours,
      LIMITS.weeklyLeadHours[0],
      LIMITS.weeklyLeadHours[1],
    ),
    totalLeadHours: hours(
      env.GOAL_REMINDER_TOTAL_LEAD_HOURS,
      DEFAULT_GOAL_REMINDER_SETTINGS.totalLeadHours,
      LIMITS.totalLeadHours[0],
      LIMITS.totalLeadHours[1],
    ),
  };
}
