import { createClient } from "@/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Retrieves a Bearer token for the current Supabase session.
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

export interface FeedbackParams {
  conversation_id: string;
  message_id?: string;
  message_content: string;
  // 1 = thumbs up, -1 = thumbs down.
  rating: 1 | -1;
  feedback_text?: string;
}

// Submits a thumbs-up / thumbs-down rating for a single assistant message.
export async function submitFeedback(params: FeedbackParams): Promise<void> {
  const headers = await getAuthHeader();
  await fetch(`${API_URL}/api/v1/feedback`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
}
