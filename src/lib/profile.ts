import { createClient } from "@/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type ResponseStyle =
  | "balanced"
  | "concise"
  | "detailed"
  | "friendly"
  | "technical";

export interface UserProfile {
  display_name?: string;
  about_you?: string;
  custom_instructions?: string;
  response_style?: ResponseStyle;
}

// Attach the Supabase JWT so the backend can identify the user.
async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return {};
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

export async function getProfile(): Promise<UserProfile> {
  const headers = await getAuthHeader();
  const response = await fetch(`${API_URL}/api/v1/profile`, { headers });
  if (!response.ok) return {};
  return response.json();
}

export async function saveProfile(profile: UserProfile): Promise<UserProfile> {
  const headers = await getAuthHeader();
  const response = await fetch(`${API_URL}/api/v1/profile`, {
    method: "POST",
    headers,
    body: JSON.stringify(profile),
  });
  if (!response.ok) throw new Error("Failed to save profile");
  return response.json();
}

// ─── Memory types and API calls ───────────────────────────────────────────────

export interface Memory {
  id: string;
  memory: string;
  category: string;
  importance: number;
  created_at: string;
}

export async function getMemories(): Promise<Memory[]> {
  const headers = await getAuthHeader();
  const response = await fetch(`${API_URL}/api/v1/memories`, { headers });
  if (!response.ok) return [];
  return response.json();
}

// Marks onboarding as complete for the current user.
export async function completeOnboarding(): Promise<void> {
  const headers = await getAuthHeader();
  await fetch(`${API_URL}/api/v1/profile/complete-onboarding`, {
    method: "POST",
    headers,
  });
}

// Returns true if the user has already completed onboarding.
export async function checkOnboardingStatus(): Promise<boolean> {
  const headers = await getAuthHeader();
  const response = await fetch(`${API_URL}/api/v1/profile`, { headers });
  if (!response.ok) return false;
  const profile = await response.json();
  return profile.onboarding_completed === true;
}

export async function deleteMemory(id: string): Promise<void> {
  const headers = await getAuthHeader();
  await fetch(`${API_URL}/api/v1/memories/${id}`, {
    method: "DELETE",
    headers,
  });
}

// ─── Conversation scores / productivity dashboard ─────────────────────────────

export interface ScoresSummary {
  total_conversations: number;
  avg_productivity: number;
  avg_complexity: number;
  avg_satisfaction: number;
  total_time_saved_minutes: number;
  total_time_saved_hours: number;
  total_messages: number;
  category_breakdown: Record<string, number>;
  top_topics: { topic: string; count: number }[];
  daily_scores: {
    date: string;
    count: number;
    avg_productivity: number;
    time_saved: number;
  }[];
  weekly_report: {
    conversations: number;
    avg_productivity: number;
    time_saved_minutes: number;
    time_saved_hours: number;
    top_category: string;
    best_day: string;
  } | null;
  best_day: string | null;
  days: number;
}

export interface ConversationScore {
  id: string;
  conversation_id: string;
  productivity_score: number;
  complexity_score: number;
  satisfaction_score: number;
  category: string;
  topics: string[];
  time_saved_minutes: number;
  summary: string;
  message_count: number;
  scored_at: string;
}

export async function getScoresSummary(
  days: number = 30
): Promise<ScoresSummary | null> {
  const headers = await getAuthHeader();
  const response = await fetch(
    `${API_URL}/api/v1/scores/summary?days=${days}`,
    { headers }
  );
  if (!response.ok) return null;
  return response.json();
}

export async function getRecentScores(
  limit: number = 10
): Promise<ConversationScore[]> {
  const headers = await getAuthHeader();
  const response = await fetch(
    `${API_URL}/api/v1/scores/recent?limit=${limit}`,
    { headers }
  );
  if (!response.ok) return [];
  return response.json();
}
