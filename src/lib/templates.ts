const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Template {
  id: string;
  command: string;
  title: string;
  description: string;
  // Emoji or short string displayed beside the template in the popup.
  icon: string;
}

// Fetches all available prompt templates from the backend.
export async function getTemplates(): Promise<Template[]> {
  try {
    const response = await fetch(`${API_URL}/api/v1/templates`);
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}
