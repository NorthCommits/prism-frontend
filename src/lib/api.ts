const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ModelId = "coding" | "writing" | "auto";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  model_id?: ModelId;
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
}

export interface ChatResponse {
  reply: string;
  model_name: string;
  model_id: string;
  routed_to?: string;
  routing_reason?: string;
  search_used?: boolean;
  search_query?: string;
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
  conversation_history?: HistoryMessage[]
): Promise<ChatResponse> {
  const body: Record<string, unknown> = { message, model_id };
  if (file_name && file_type && file_content) {
    body.file_name = file_name;
    body.file_type = file_type;
    body.file_content = file_content;
  }
  if (conversation_history && conversation_history.length > 0) {
    body.conversation_history = conversation_history;
  }
  const response = await fetch(`${API_URL}/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Something went wrong");
  }

  return response.json();
}

export async function fetchModels(): Promise<Record<string, AvailableModel>> {
  const response = await fetch(`${API_URL}/api/v1/models`);
  if (!response.ok) throw new Error("Failed to fetch models");
  return response.json();
}