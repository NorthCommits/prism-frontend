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

export async function deleteMemory(id: string): Promise<void> {
  const headers = await getAuthHeader();
  await fetch(`${API_URL}/api/v1/memories/${id}`, {
    method: "DELETE",
    headers,
  });
}
