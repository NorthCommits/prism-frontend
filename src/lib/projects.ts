import { createClient } from "@/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

// Multipart upload does not set Content-Type so the browser can add the boundary.
async function getAuthHeaderMultipart(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  instructions?: string;
  color: string;
  file_count: number;
  total_size: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export const PROJECT_COLORS = [
  "#8b5cf6", // purple (default)
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#22c55e", // green
  "#f97316", // orange
  "#3b82f6", // blue
];

// Returns a human-readable size string like "2.4 MB".
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function getProjects(): Promise<Project[]> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/v1/projects`, { headers });
  if (!res.ok) return [];
  return res.json();
}

export async function getProject(
  id: string
): Promise<Project & { files: ProjectFile[] }> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/v1/projects/${id}`, { headers });
  if (!res.ok) throw new Error("Failed to load project");
  return res.json();
}

export async function createProject(data: {
  name: string;
  description?: string;
  instructions?: string;
  color?: string;
}): Promise<Project> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/v1/projects`, {
    method: "POST",
    headers,
    body: JSON.stringify({ color: PROJECT_COLORS[0], ...data }),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

export async function updateProject(
  id: string,
  data: Partial<Pick<Project, "name" | "description" | "instructions" | "color">>
): Promise<Project> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/v1/projects/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update project");
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/v1/projects/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete project");
}

export async function uploadProjectFile(
  projectId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<ProjectFile> {
  const headers = await getAuthHeaderMultipart();
  const form = new FormData();
  form.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/api/v1/projects/${projectId}/files`);

    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error("Invalid response")); }
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}

export async function deleteProjectFile(
  projectId: string,
  fileId: string
): Promise<void> {
  const headers = await getAuthHeader();
  const res = await fetch(
    `${API_URL}/api/v1/projects/${projectId}/files/${fileId}`,
    { method: "DELETE", headers }
  );
  if (!res.ok) throw new Error("Failed to delete file");
}

export async function getProjectConversations(
  projectId: string
): Promise<{ id: string; title: string; updated_at: string }[]> {
  const headers = await getAuthHeader();
  const res = await fetch(
    `${API_URL}/api/v1/projects/${projectId}/conversations`,
    { headers }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function linkConversationToProject(
  conversationId: string,
  projectId: string | null
): Promise<void> {
  const headers = await getAuthHeader();
  const response = await fetch(
    `${API_URL}/api/v1/conversations/${conversationId}/link-project`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ project_id: projectId }),
    }
  );
  console.log("Link project response:", response.status);
}
