const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

import { createClient } from "@/lib/supabase";

export interface Conversation {
  id: string;
  title: string;
  model_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  model_id?: string;
  routed_to?: string;
  routing_reason?: string;
  search_used?: boolean;
  search_query?: string;
  file_used?: boolean;
  file_name?: string;
  created_at: string;
}

export interface SaveMessagePayload {
  conversation_id: string;
  role: string;
  content: string;
  model_id?: string;
  routed_to?: string;
  routing_reason?: string;
  search_used?: boolean;
  search_query?: string;
  file_used?: boolean;
  file_name?: string;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return {};
    return { Authorization: `Bearer ${session.access_token}` };
  } catch {
    return {};
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail: string | undefined;
    try {
      const data = await response.json();
      detail = data.detail || data.message;
    } catch {
      // Ignore JSON parse errors.
    }
    throw new Error(detail || `Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function getConversations(): Promise<Conversation[]> {
  const headers = await getAuthHeader();
  const response = await fetch(`${API_URL}/api/v1/conversations`, {
    headers,
  });
  return handleResponse<Conversation[]>(response);
}

export async function getConversationMessages(
  id: string
): Promise<Message[]> {
  const headers = await getAuthHeader();
  const response = await fetch(
    `${API_URL}/api/v1/conversations/${encodeURIComponent(id)}/messages`,
    { headers }
  );
  return handleResponse<Message[]>(response);
}

export async function createConversation(
  title: string,
  model_id: string
): Promise<Conversation> {
  const headers = await getAuthHeader();
  const response = await fetch(`${API_URL}/api/v1/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({ title, model_id }),
  });
  return handleResponse<Conversation>(response);
}

export async function saveMessage(
  data: SaveMessagePayload
): Promise<Message> {
  const headers = await getAuthHeader();
  const response = await fetch(`${API_URL}/api/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Message>(response);
}

export interface SearchResult {
  id: string;
  title: string;
  updated_at: string;
  match_type: "title" | "message";
  snippet?: string;
  snippet_role?: string;
}

// Full-text conversation search — debounced on the call-site.
export async function searchConversations(
  query: string
): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const headers = await getAuthHeader();
  const response = await fetch(
    `${API_URL}/api/v1/search?q=${encodeURIComponent(query)}`,
    { headers }
  );
  if (!response.ok) return [];
  return response.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const headers = await getAuthHeader();
  const response = await fetch(
    `${API_URL}/api/v1/conversations/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers,
    }
  );
  if (!response.ok && response.status !== 404) {
    let detail: string | undefined;
    try {
      const data = await response.json();
      detail = data.detail || data.message;
    } catch {
      // Ignore JSON parse errors.
    }
    throw new Error(detail || `Failed to delete conversation ${id}`);
  }
}

