// ─── Token / session management ───────────────────────────────────────────────

const TOKEN_KEY = "lms_token";
const USER_KEY  = "lms_user";

export type StoredUser = {
  id:       string;
  username: string;
  email:    string;
  role:     "student" | "admin";
  isSuperAdmin?: boolean;
  appId?:   string;
  appSlug?: string;
};

export function saveSession(token: string, user: StoredUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as StoredUser; }
  catch { return null; }
}

// ─── onAuthStateChanged replacement ───────────────────────────────────────────
// Reads localStorage synchronously, fires the callback asynchronously (matching
// Firebase's async behaviour), returns a no-op unsubscribe for API symmetry.
export function checkAuthState(
  callback: (user: StoredUser | null) => void
): () => void {
  const user = getStoredUser();
  setTimeout(() => callback(user), 0);
  return () => {};
}

// ─── Base fetch helper ─────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  skipAuthRedirect = false
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401 && !skipAuthRedirect && typeof window !== "undefined") {
      clearSession();
      window.location.href = "/";
      return undefined as unknown as T;
    }
    const body = await res.json().catch(() => ({}));
    const err: any = new Error((body as any).error ?? `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export async function loginWithEmailAndPassword(
  email: string,
  password: string
): Promise<StoredUser> {
  const data = await apiFetch<{ token: string; user: StoredUser }>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    true
  );
  saveSession(data.token, data.user);
  return data.user;
}

export async function loginSuperAdmin(
  email: string,
  password: string
): Promise<StoredUser> {
  const data = await apiFetch<{ token: string; user: StoredUser }>(
    "/api/superauth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
    true
  );
  saveSession(data.token, data.user);
  return data.user;
}

export function signOutUser(): void {
  clearSession();
}

// ─── Users ─────────────────────────────────────────────────────────────────────

export async function getUserProfile(
  id: string
): Promise<{ data: { userProfile: StoredUser | null } }> {
  const data = await apiFetch<{ userProfile: StoredUser | null }>(
    `/api/users/${id}`
  );
  return { data };
}

export async function listUserProfiles(): Promise<{
  data: { userProfiles: StoredUser[] };
}> {
  const data = await apiFetch<{ userProfiles: StoredUser[] }>("/api/users");
  return { data };
}

export async function createUser(payload: {
  email:    string;
  username: string;
  password: string;
  role:     string;
}): Promise<{ data: { userProfile: StoredUser } }> {
  const data = await apiFetch<{ userProfile: StoredUser }>("/api/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { data };
}

export async function upsertUserProfile(payload: {
  id:       string;
  username: string;
  email:    string;
  role:     string;
}): Promise<{ data: { userProfile: StoredUser } }> {
  const data = await apiFetch<{ userProfile: StoredUser }>(
    `/api/users/${payload.id}`,
    {
      method: "PUT",
      body: JSON.stringify({ username: payload.username, role: payload.role }),
    }
  );
  return { data };
}

export async function deleteUserProfile(id: string): Promise<void> {
  await apiFetch<{ message: string }>(`/api/users/${id}`, {
    method: "DELETE",
  });
}

// ─── Progress ──────────────────────────────────────────────────────────────────

export interface ProgressRecord {
  userId:       string;
  lessonId:     string;
  learnIndex:   number;
  p2Stars:      string;
  p3Score:      number | null;
  p4LinksCount: number;
  updatedAt:    string;
}

export async function getUserProgress(
  lessonId: string
): Promise<{ data: { userProgress: ProgressRecord | null } }> {
  const data = await apiFetch<{ userProgress: ProgressRecord | null }>(
    `/api/progress/${lessonId}`
  );
  return { data };
}

export async function getUserProgressList(
  lessonIds: string[]
): Promise<{ data: { userProgresses: ProgressRecord[] } }> {
  const qs = lessonIds.join(",");
  const data = await apiFetch<{ userProgresses: ProgressRecord[] }>(
    `/api/progress?lessonIds=${encodeURIComponent(qs)}`
  );
  return { data };
}

export async function getUserProgressListAll(
  lessonIds: string[]
): Promise<{ data: { userProgresses: ProgressRecord[] } }> {
  const qs = lessonIds.join(",");
  const data = await apiFetch<{ userProgresses: ProgressRecord[] }>(
    `/api/progress/all?lessonIds=${encodeURIComponent(qs)}`
  );
  return { data };
}

export async function saveUserProgress(payload: {
  lessonId:     string;
  learnIndex:   number;
  p2Stars:      string;
  p3Score:      number | null;
  p4LinksCount: number;
}): Promise<void> {
  await apiFetch("/api/progress", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── Lessons ───────────────────────────────────────────────────────────────────

export interface ApiWordData {
  id: string;
  text: string;
  image: string;
  phonetic: string;
}

export interface ApiLinkData {
  id?: number;
  text: string;
  url: string;
}

export interface LessonSummary {
  id: string;
  title: string;
  icon?: string;
  sortOrder: number;
  wordCount: number;
  linkCount: number;
}

export interface LessonFull extends LessonSummary {
  words: ApiWordData[];
  externalLinks: ApiLinkData[];
}

export async function listLessons(): Promise<{ lessons: LessonSummary[] }> {
  return apiFetch<{ lessons: LessonSummary[] }>("/api/lessons");
}

export async function getLessonById(id: string): Promise<{ lesson: LessonFull | null }> {
  return apiFetch<{ lesson: LessonFull | null }>(`/api/lessons/${id}`);
}

export async function createLesson(
  payload: Omit<LessonFull, "wordCount" | "linkCount">
): Promise<{ lesson: LessonFull }> {
  return apiFetch<{ lesson: LessonFull }>("/api/lessons", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateLesson(
  id: string,
  payload: Omit<LessonFull, "id" | "wordCount" | "linkCount">
): Promise<{ lesson: LessonFull }> {
  return apiFetch<{ lesson: LessonFull }>(`/api/lessons/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteLesson(id: string): Promise<void> {
  await apiFetch<{ message: string }>(`/api/lessons/${id}`, { method: "DELETE" });
}

export interface BulkLessonPayload {
  id: string;
  title: string;
  icon?: string;
  sortOrder?: number;
  words?: ApiWordData[];
  externalLinks?: ApiLinkData[];
}

export interface BulkLessonImportResult {
  success: boolean;
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    words: number;
    links: number;
    errors: Array<{ index: number; lessonId: string; error: string }>;
  };
}

export async function importBulkLessons(
  lessons: BulkLessonPayload[],
  overwrite = true
): Promise<BulkLessonImportResult> {
  return apiFetch<BulkLessonImportResult>("/api/lessons/bulk", {
    method: "POST",
    body: JSON.stringify({ lessons, overwrite }),
  });
}

// ─── App Management ────────────────────────────────────────────────────────────

export interface AppRecord {
  id: string;
  slug: string;
  name: string;
  logo_path: string;
  user_count?: number;
  created_at?: string;
}

export async function listApps(): Promise<{ apps: AppRecord[] }> {
  return apiFetch<{ apps: AppRecord[] }>("/api/apps");
}

export async function getAppBySlug(slug: string): Promise<{ app: AppRecord }> {
  return apiFetch<{ app: AppRecord }>(`/api/apps/by-slug/${slug}`, {}, true);
}

export async function createApp(payload: { name: string; slug: string }): Promise<{ app: AppRecord }> {
  return apiFetch<{ app: AppRecord }>("/api/apps", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateApp(id: string, payload: { name: string; slug: string }): Promise<{ app: AppRecord }> {
  return apiFetch<{ app: AppRecord }>(`/api/apps/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function uploadAppLogo(id: string, file: File): Promise<{ logo_path: string }> {
  const formData = new FormData();
  formData.append("logo", file);

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api/apps/${id}/logo`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Logo upload failed (HTTP ${res.status})`);
  }

  return res.json();
}

export async function deleteApp(id: string): Promise<void> {
  await apiFetch<void>(`/api/apps/${id}`, { method: "DELETE" });
}

export async function deleteAllAppLessons(appId: string): Promise<{ message: string; deleted: number }> {
  return apiFetch<{ message: string; deleted: number }>(`/api/apps/${appId}/lessons`, { method: "DELETE" });
}

export async function assignAdminToApp(
  appId: string,
  payload: { email: string; username: string; password: string }
): Promise<any> {
  return apiFetch<any>(`/api/apps/${appId}/admins`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface AdminRecord {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at?: string;
}

export async function listAppAdmins(appId: string): Promise<{ admins: AdminRecord[] }> {
  return apiFetch<{ admins: AdminRecord[] }>(`/api/apps/${appId}/admins`);
}

export async function updateAppAdmin(
  appId: string,
  adminId: string,
  payload: { username?: string; email?: string; password?: string }
): Promise<{ admin: AdminRecord }> {
  return apiFetch<{ admin: AdminRecord }>(`/api/apps/${appId}/admins/${adminId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteAppAdmin(appId: string, adminId: string): Promise<void> {
  await apiFetch<void>(`/api/apps/${appId}/admins/${adminId}`, { method: "DELETE" });
}
