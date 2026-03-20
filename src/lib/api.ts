const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ModelId = "coding" | "writing" | "auto";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  model_id?: ModelId;
  /** When true, assistant content is being streamed token-by-token. */
  isStreaming?: boolean;
  routed_to?: ModelId;
  routing_reason?: string;
  search_used?: boolean;
  search_query?: string;
  file_used?: boolean;
  file_name?: string;
  file_type?: string;
  file_content?: string;
  response_type?: "text" | "plot" | "image";
  plot_json?: object;
  image_url?: string;
  // User-uploaded image sent with this message (not persisted in history).
  image_base64?: string;
  image_media_type?: string;
  image_used?: boolean;
}

export interface ChatResponse {
  reply: string;
  model_name: string;
  model_id: string;
  routed_to?: string;
  routing_reason?: string;
  search_used?: boolean;
  search_query?: string;
  image_used?: boolean;
  response_type?: "text" | "plot" | "image";
  plot_json?: object;
  image_url?: string;
}

export interface ParsedFile {
  file_name: string;
  file_type: string;
  content: string;
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
  // Which specialist model handled this turn — used by the backend for
  // context compression to add model-switch notes between turns.
  model_id?: string;
}

export interface AvailableModel {
  name: string;
  description: string;
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_URL}/api/v1/file/parse`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("File parsing failed");
  }
  return response.json();
}

export async function sendMessage(
  message: string,
  model_id: ModelId,
  file_name?: string,
  file_type?: string,
  file_content?: string,
  conversation_history?: HistoryMessage[],
  user_id?: string,
  image_base64?: string,
  image_media_type?: string
): Promise<ChatResponse> {
  // Backward-compatible wrapper around the streaming endpoint.
  return await new Promise<ChatResponse>((resolve, reject) => {
    let accumulatedReply = "";
    let latestMetadata: Partial<ChatResponse> = {};

    sendMessageStream(
      message,
      model_id,
      conversation_history ?? [],
      (token) => {
        accumulatedReply += token;
      },
      (metadata) => {
        latestMetadata = metadata;
      },
      () => {
        resolve({
          reply: accumulatedReply,
          model_name: latestMetadata.model_name ?? "",
          model_id: latestMetadata.model_id ?? model_id,
          routed_to: latestMetadata.routed_to,
          routing_reason: latestMetadata.routing_reason,
          search_used: latestMetadata.search_used,
          search_query: latestMetadata.search_query,
          image_used: latestMetadata.image_used,
          response_type: latestMetadata.response_type ?? "text",
          plot_json: latestMetadata.plot_json,
          image_url: latestMetadata.image_url,
        });
      },
      (error) => {
        reject(new Error(error || "Something went wrong"));
      },
      file_name,
      file_type,
      file_content,
      user_id,
      image_base64,
      image_media_type
    ).catch(reject);
  });
}

export async function sendMessageStream(
  message: string,
  model_id: string,
  conversation_history: HistoryMessage[] = [],
  onToken: (token: string) => void,
  onMetadata: (metadata: Partial<ChatResponse>) => void,
  onDone: () => void,
  onError: (error: string) => void,
  file_name?: string,
  file_type?: string,
  file_content?: string,
  // Passed to the backend so it can inject the user's custom instructions.
  user_id?: string,
  // Base64-encoded image for vision requests (not stored in conversation history).
  image_base64?: string,
  image_media_type?: string
): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        model_id,
        conversation_history,
        file_name,
        file_type,
        file_content,
        user_id,
        image_base64,
        image_media_type,
      }),
    });

    if (!response.ok) {
      let detail = "Something went wrong";
      try {
        const data = await response.json();
        detail = (data && (data.detail || data.message)) || detail;
      } catch {
        // Ignore JSON parse errors.
      }
      onError(detail);
      return;
    }

    // check if response is JSON (plot/image) or SSE (text)
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as ChatResponse;
      onMetadata(data);
      onToken(data.reply);
      onDone();
      return;
    }

    // Only parse SSE when content-type is explicitly an SSE stream.
    if (!contentType.includes("text/event-stream")) {
      onError(`Unexpected content-type: ${contentType || "unknown"}`);
      return;
    }

    // SSE stream for text responses
    const reader = response.body?.getReader();
    if (!reader) {
      onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data) continue;

        try {
          const event = JSON.parse(data) as {
            type: string;
            content?: string;
            message?: string;
            [key: string]: unknown;
          };

          if (event.type === "metadata") onMetadata(event as Partial<ChatResponse>);
          else if (event.type === "token") {
            if (typeof event.content === "string") onToken(event.content);
          } else if (event.type === "done") onDone();
          else if (event.type === "error") onError(event.message || "Something went wrong");
        } catch {
          // Ignore malformed JSON lines.
        }
      }
    }

    const last = buffer.trim();
    if (last.startsWith("data: ")) {
      const data = last.slice(6).trim();
      if (data) {
        try {
          const event = JSON.parse(data) as {
            type: string;
            content?: string;
            message?: string;
            [key: string]: unknown;
          };

          if (event.type === "metadata") onMetadata(event as Partial<ChatResponse>);
          else if (event.type === "token") {
            if (typeof event.content === "string") onToken(event.content);
          } else if (event.type === "done") onDone();
          else if (event.type === "error") onError(event.message || "Something went wrong");
        } catch {
          // Ignore malformed JSON lines.
        }
      }
    }
  } catch (err) {
    onError((err as Error)?.message || "Something went wrong");
  }
}

export async function fetchModels(): Promise<Record<string, AvailableModel>> {
  const response = await fetch(`${API_URL}/api/v1/models`);
  if (!response.ok) throw new Error("Failed to fetch models");
  return response.json();
}