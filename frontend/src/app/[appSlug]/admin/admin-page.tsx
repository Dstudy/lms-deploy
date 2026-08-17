"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Home,
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  RefreshCw,
  ShieldAlert,
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  BarChart2,
  BookOpen,
  Award,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

import {
  checkAuthState,
  getUserProfile,
  listUserProfiles,
  createUser,
  upsertUserProfile,
  deleteUserProfile,
  getUserProgressListAll,
  listLessons,
  createLesson,
  deleteLesson,
  getAppBySlug,
  ProgressRecord,
  LessonSummary,
  AppRecord
} from "@/lib/api";
import LessonFormFields, { LessonFormState } from "@/components/LessonFormFields";
import ImportLessonsDialog from "@/components/ImportLessonsDialog";
import { downloadSampleLessonCSV } from "@/lib/csv-lesson-parser";
import * as XLSX from "xlsx";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AccountFormData {
  account: string;
  username: string;
  password: string;
  role: string;
}

interface EditFormData {
  username: string;
  role: string;
}

type AllProgressMap = Record<string, Record<string, ProgressRecord>>;

export default function AppAdminDashboard() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const appSlug = params.appSlug as string;

  const [app, setApp] = useState<AppRecord | null>(null);
  const [appLoading, setAppLoading] = useState(true);
  const [appError, setAppError] = useState(false);

  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Bulk import states
  const [file, setFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accounts CRUD states
  const [accounts, setAccounts] = useState<UserProfile[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<AccountFormData>({
    account: "",
    username: "",
    password: "",
    role: "student",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({ username: "", role: "student" });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Student progress tab
  const [allProgress, setAllProgress] = useState<AllProgressMap>({});
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressSearchQuery, setProgressSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Lessons tab
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonCreateOpen, setLessonCreateOpen] = useState(false);
  const [bulkLessonOpen, setBulkLessonOpen] = useState(false);
  const [lessonDeleteOpen, setLessonDeleteOpen] = useState(false);
  const [lessonTarget, setLessonTarget] = useState<LessonSummary | null>(null);
  const [lessonSaving, setLessonSaving] = useState(false);
  const [lessonDeleting, setLessonDeleting] = useState(false);
  const [lessonError, setLessonError] = useState("");
  const [lessonForm, setLessonForm] = useState<LessonFormState>({
    id: "", title: "", icon: "", sortOrder: 0, words: [], externalLinks: [],
  });

  // Fetch App branding
  useEffect(() => {
    if (!appSlug) return;
    getAppBySlug(appSlug)
      .then((res) => {
        setApp(res.app);
      })
      .catch((err) => {
        console.error("App load error:", err);
        setAppError(true);
      })
      .finally(() => {
        setAppLoading(false);
      });
  }, [appSlug]);

  useEffect(() => {
    const unsubscribe = checkAuthState(async (currentUser) => {
      if (!currentUser) {
        router.push(`/admin?slug=${appSlug}`);
        return;
      }

      // Check role and app alignment
      if (currentUser.role !== "admin" || (currentUser.appSlug !== appSlug && !currentUser.isSuperAdmin)) {
        setIsAdmin(false);
        setAuthLoading(false);
        return;
      }

      try {
        const response = await getUserProfile(currentUser.id);
        const userRole = response.data?.userProfile?.role;
        setIsAdmin(userRole === "admin");
      } catch (err) {
        console.error("Failed to verify admin permissions:", err);
        setIsAdmin(false);
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router, appSlug]);

  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const response = await listUserProfiles();
      setAccounts((response.data?.userProfiles ?? []) as UserProfile[]);
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const fetchLessons = useCallback(async () => {
    setLessonsLoading(true);
    try {
      const { lessons: fetched } = await listLessons();
      setLessons(fetched);
    } catch (err) {
      console.error("Failed to fetch lessons:", err);
    } finally {
      setLessonsLoading(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleBulkUpload = async () => {
    if (!file) return;
    setImportLoading(true);
    setImportStatus("Reading Excel file structure...");

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (!reader.result) return;
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rawAccount = String(
            row.account || row.Account || row.email || row.Email || "",
          ).trim();
          const password = String(row.password || row.Password || "").trim();
          const role = String(row.role || row.Role || "student").toLowerCase().trim();
          const username = String(
            row.username || row.Username || row.name || row.Name || rawAccount,
          ).trim();

          setImportStatus(`Processing account ${i + 1}/${rows.length}: ${rawAccount || "Unknown"}`);

          if (!rawAccount || password.length < 6) {
            failCount++;
            continue;
          }

          const syntheticEmail = `${rawAccount}@uni.edu.com`;
          try {
            await createUser({ email: syntheticEmail, username, password, role });
            successCount++;
          } catch (error) {
            console.error(`Error creating account for ${rawAccount}:`, error);
            failCount++;
          }

          await delay(200);
        }

        setImportStatus(
          `Finished! Successfully created ${successCount} accounts. Failed/Skipped: ${failCount}.`,
        );
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await fetchAccounts();
      } catch (err: any) {
        setImportStatus(`Failed to parse spreadsheet: ${err.message}`);
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCreateSubmit = async () => {
    setCreateError("");
    const { account, username, password, role } = createForm;
    if (!account.trim()) { setCreateError("Account ID is required."); return; }
    if (password.length < 6) { setCreateError("Password must be at least 6 characters."); return; }

    setCreateLoading(true);
    const syntheticEmail = `${account.trim()}@uni.edu.com`;
    const displayName = username.trim() || account.trim();
    try {
      await createUser({ email: syntheticEmail, username: displayName, password, role });
      setCreateOpen(false);
      setCreateForm({ account: "", username: "", password: "", role: "student" });
      toast({
        title: "Success",
        description: `Account for ${displayName} created successfully.`,
      });
      await fetchAccounts();
    } catch (err: any) {
      if (err.status === 409) {
        setCreateError("An account with that ID already exists.");
      } else {
        setCreateError(err.message ?? "Failed to create account.");
      }
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (profile: UserProfile) => {
    setEditTarget(profile);
    setEditForm({ username: profile.username, role: profile.role });
    setEditError("");
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editTarget) return;
    setEditError("");
    if (!editForm.username.trim()) { setEditError("Username is required."); return; }

    setEditLoading(true);
    try {
      await upsertUserProfile({
        id: editTarget.id,
        username: editForm.username.trim(),
        email: editTarget.email,
        role: editForm.role,
      });
      setEditOpen(false);
      setEditTarget(null);
      toast({
        title: "Success",
        description: "User details updated successfully.",
      });
      await fetchAccounts();
    } catch (err: any) {
      setEditError(err.message ?? "Failed to update account.");
    } finally {
      setEditLoading(false);
    }
  };

  const openDelete = (profile: UserProfile) => {
    setDeleteTarget(profile);
    setDeleteError("");
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await deleteUserProfile(deleteTarget.id);
      setDeleteOpen(false);
      setDeleteTarget(null);
      toast({
        title: "Success",
        description: `Account for ${deleteTarget.username} has been deleted successfully.`,
      });
      await fetchAccounts();
    } catch (err: any) {
      const errMsg = err.message ?? "Failed to delete account.";
      console.error("Failed to delete account:", err);
      setDeleteError(errMsg);
      toast({
        variant: "destructive",
        title: "Error",
        description: errMsg,
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredAccounts = accounts.filter((a) => {
    const q = searchQuery.toLowerCase();
    return (
      a.username.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q)
    );
  });

  const fetchAllStudentProgress = async () => {
    setProgressLoading(true);
    try {
      if (accounts.length === 0) await fetchAccounts();
      let lessonIds = lessons.map((l) => l.id);
      if (lessonIds.length === 0) {
        const { lessons: fetched } = await listLessons();
        setLessons(fetched);
        lessonIds = fetched.map((l) => l.id);
      }
      if (lessonIds.length === 0) {
        // No lessons exist yet — nothing to fetch
        setAllProgress({});
        return;
      }
      const response = await getUserProgressListAll(lessonIds);
      const grouped: AllProgressMap = {};
      for (const record of response.data?.userProgresses ?? []) {
        if (!grouped[record.userId]) grouped[record.userId] = {};
        grouped[record.userId][record.lessonId] = record as ProgressRecord;
      }
      setAllProgress(grouped);
    } catch (err) {
      console.error("Failed to fetch student progress:", err);
    } finally {
      setProgressLoading(false);
    }
  };

  const calculateLessonPercentage = (progress: ProgressRecord, lesson: LessonSummary): number => {
    const totalWords = lesson.wordCount || 0;
    const totalLinks = lesson.linkCount || 0;

    const part1 = totalWords > 0 ? Math.min((progress.learnIndex || 0) / totalWords, 1) : 0;

    let part2 = 0;
    if (progress.p2Stars && totalWords > 0) {
      try {
        const stars = JSON.parse(progress.p2Stars);
        part2 = Math.min(Object.keys(stars).length / totalWords, 1);
      } catch {}
    }

    const part3 = typeof progress.p3Score === "number" ? 1 : 0;
    const part4 = totalLinks > 0 ? Math.min((progress.p4LinksCount || 0) / totalLinks, 1) : 1;

    return Math.min(Math.round((part1 + part2 + part3 + part4) * 25), 100);
  };

  const getStudentSummary = (userId: string) => {
    const userMap = allProgress[userId] ?? {};
    let completed = 0;
    let inProgress = 0;
    let totalPercent = 0;

    for (const lesson of lessons) {
      const record = userMap[lesson.id];
      const pct = record ? calculateLessonPercentage(record, lesson) : 0;
      totalPercent += pct;
      if (pct === 100) completed++;
      else if (pct > 0) inProgress++;
    }

    const lessonCount = lessons.length || 1;
    const notStarted = lessonCount - completed - inProgress;
    const averagePercent = Math.round(totalPercent / lessonCount);
    return { completed, inProgress, notStarted, averagePercent };
  };

  const filteredStudents = accounts
    .filter((a) => a.role === "student")
    .filter((a) => {
      const q = progressSearchQuery.toLowerCase();
      if (!q) return true;
      const accountId = a.email.replace("@uni.edu.com", "");
      return a.username.toLowerCase().includes(q) || accountId.toLowerCase().includes(q);
    });

  const selectedStudent = selectedStudentId ? accounts.find((a) => a.id === selectedStudentId) ?? null : null;

  if (appLoading || authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-bold text-muted-foreground animate-pulse">
            Checking Permissions...
          </p>
        </div>
      </div>
    );
  }

  if (appError || !app) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-white p-4 text-center">
        <ShieldAlert className="h-16 w-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">App Not Found</h2>
        <p className="text-slate-500 max-w-md mb-6">
          The requested application slug is invalid.
        </p>
        <Link href="/">
          <Button className="font-semibold rounded-xl px-6 h-12">Return Home</Button>
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-white p-4 text-center">
        <ShieldAlert className="h-16 w-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-500 max-w-md mb-6">
          You do not have administrative privileges to access this control surface.
        </p>
        <Link href={`/${appSlug}`}>
          <Button className="font-semibold rounded-xl px-6 h-12">Return to Classroom</Button>
        </Link>
      </div>
    );
  }

  return (
    <main className="flex-1 bg-white p-8 max-w-5xl mx-auto w-full">
      {/* Branded Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <Link href={`/${appSlug}`}>
            <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full border">
              <ArrowLeft />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            {app.logo_path ? (
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={`${BASE_URL}/${app.logo_path}`}
                  alt={app.name}
                  className="object-contain w-full h-full p-1"
                />
              </div>
            ) : (
              <Award className="text-secondary w-8 h-8" />
            )}
            <div>
              <h1 className="text-3xl font-extrabold text-slate-850">{app.name}</h1>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Management Control Center</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="accounts" onValueChange={(v) => {
        if (v === "accounts") fetchAccounts();
        if (v === "progress") fetchAllStudentProgress();
        if (v === "lessons") fetchLessons();
      }}>
        <TabsList className="mb-8 rounded-2xl">
          <TabsTrigger value="accounts" className="rounded-xl flex items-center gap-2">
            <Users className="w-4 h-4" />
            Manage Accounts
          </TabsTrigger>
          <TabsTrigger value="bulk" className="rounded-xl flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Bulk Import
          </TabsTrigger>
          <TabsTrigger value="progress" className="rounded-xl flex items-center gap-2">
            <BarChart2 className="w-4 h-4" />
            Student Progress
          </TabsTrigger>
          <TabsTrigger value="lessons" className="rounded-xl flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Manage Lessons
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Manage Accounts ── */}
        <TabsContent value="accounts">
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-emerald-600" />
                <h2 className="text-2xl font-bold">Account Management</h2>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchAccounts}
                  disabled={accountsLoading}
                  className="rounded-xl border"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${accountsLoading ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  onClick={() => { setCreateError(""); setCreateOpen(true); }}
                  className="rounded-xl flex items-center gap-2 font-bold"
                >
                  <Plus className="w-4 h-4" />
                  New Account
                </Button>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by username, account, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {accountsLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Loading accounts...</span>
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <Users className="w-10 h-10 opacity-30" />
                <p className="font-medium">No accounts yet.</p>
                <Button variant="outline" onClick={fetchAccounts} className="mt-2 rounded-xl">
                  Load Accounts
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-bold text-slate-600">Username</TableHead>
                      <TableHead className="font-bold text-slate-600">Account ID</TableHead>
                      <TableHead className="font-bold text-slate-600">Role</TableHead>
                      <TableHead className="font-bold text-slate-600 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-slate-400 py-10">
                          No accounts match your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAccounts.map((profile) => {
                        const accountId = profile.email.replace("@uni.edu.com", "");
                        return (
                          <TableRow key={profile.id} className="hover:bg-slate-50">
                            <TableCell className="font-semibold">{profile.username}</TableCell>
                            <TableCell className="text-slate-500 font-mono text-sm">{accountId}</TableCell>
                            <TableCell>
                              <Badge
                                variant={profile.role === "admin" ? "default" : "secondary"}
                                className="rounded-full capitalize"
                              >
                                {profile.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEdit(profile)}
                                  className="h-8 w-8 rounded-lg text-slate-500 hover:text-primary"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDelete(profile)}
                                  className="h-8 w-8 rounded-lg text-slate-500 hover:text-rose-500"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
                  {filteredAccounts.length} of {accounts.length} account{accounts.length !== 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab 2: Bulk Import ── */}
        <TabsContent value="bulk">
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                <h2 className="text-2xl font-bold">Bulk Import Tools</h2>
              </div>
            </div>

            {/* Card 1: Bulk Lessons & Vocabulary Import */}
            <Card className="border border-slate-200 rounded-2xl bg-white p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-start gap-3.5">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shrink-0 mt-0.5">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-850">Bulk Lessons & Vocabulary Import</h3>
                      <Badge className="rounded-full bg-emerald-100 text-emerald-800 text-xs hover:bg-emerald-100">
                        CSV / Excel
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      Quickly import multiple lessons with vocabulary words, phonetics, image URLs, and learning resources using a single CSV or Excel spreadsheet.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Badge variant="outline" className="rounded-lg">lesson_id</Badge>
                  <Badge variant="outline" className="rounded-lg">title</Badge>
                  <Badge variant="outline" className="rounded-lg">word</Badge>
                  <Badge variant="outline" className="rounded-lg">image</Badge>
                  <Badge variant="outline" className="rounded-lg">phonetic</Badge>
                  <Badge variant="outline" className="rounded-lg">link_url</Badge>
                </div>
                <div className="flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => downloadSampleLessonCSV()}
                    className="rounded-xl font-semibold text-xs h-10 border-slate-200"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download Sample CSV
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setBulkLessonOpen(true)}
                    className="rounded-xl font-bold text-xs h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Lessons File (.csv / .xlsx)
                  </Button>
                </div>
              </div>
            </Card>

            {/* Card 2: Bulk Account Import */}
            <Card className="border border-slate-200 rounded-2xl bg-white p-6 shadow-xs">
              <div className="flex items-start gap-3.5 pb-4 border-b border-slate-100">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shrink-0 mt-0.5">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-850">Bulk Student Accounts Import</h3>
                    <Badge className="rounded-full bg-blue-100 text-blue-800 text-xs hover:bg-blue-100">
                      Excel .xlsx
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    Upload an Excel file (.xlsx) containing account credentials. Required columns:
                    <strong> account</strong>, <strong>password</strong>, <strong>username</strong>, and optional <strong>role</strong>.
                  </p>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx"
                    className="rounded-xl border-slate-200"
                    disabled={importLoading}
                  />
                  <Button
                    onClick={handleBulkUpload}
                    disabled={!file || importLoading}
                    className="rounded-xl shrink-0 font-semibold"
                  >
                    {importLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                    {importLoading ? "Importing..." : "Start Account Import"}
                  </Button>
                </div>
                {importStatus && (
                  <div className="p-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold">
                    {importStatus}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ── Tab 3: Student Progress ── */}
        <TabsContent value="progress">
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart2 className="w-6 h-6 text-emerald-600" />
                <h2 className="text-2xl font-bold">Student Progress</h2>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchAllStudentProgress}
                disabled={progressLoading}
                className="rounded-xl border"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${progressLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by student name or account ID..."
                value={progressSearchQuery}
                onChange={(e) => setProgressSearchQuery(e.target.value)}
                className="pl-10 rounded-xl bg-white"
              />
              {progressSearchQuery && (
                <button
                  onClick={() => setProgressSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {progressLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Loading student progress...</span>
              </div>
            ) : Object.keys(allProgress).length === 0 && filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <BarChart2 className="w-10 h-10 opacity-30" />
                <p className="font-medium">No data yet.</p>
                <Button variant="outline" onClick={fetchAllStudentProgress} className="mt-2 rounded-xl">
                  Load Progress
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-bold text-slate-600">Student</TableHead>
                      <TableHead className="font-bold text-slate-600">Account ID</TableHead>
                      <TableHead className="font-bold text-slate-600 text-center">Completed</TableHead>
                      <TableHead className="font-bold text-slate-600 text-center">In Progress</TableHead>
                      <TableHead className="font-bold text-slate-600 text-center">Not Started</TableHead>
                      <TableHead className="font-bold text-slate-600">Avg Progress</TableHead>
                      <TableHead className="font-bold text-slate-600 text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-slate-400 py-10">
                          No students match your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => {
                        const accountId = student.email.replace("@uni.edu.com", "");
                        const { completed, inProgress, notStarted, averagePercent } = getStudentSummary(student.id);
                        return (
                          <TableRow key={student.id} className="hover:bg-slate-50">
                            <TableCell className="font-semibold">{student.username}</TableCell>
                            <TableCell className="text-slate-500 font-mono text-sm">{accountId}</TableCell>
                            <TableCell className="text-center">
                              <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                {completed}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="rounded-full bg-blue-100 text-blue-700 hover:bg-blue-100">
                                {inProgress}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="rounded-full bg-slate-100 text-slate-500 hover:bg-slate-100">
                                {notStarted}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <Progress value={averagePercent} className="h-2 flex-1" />
                                <span className="text-sm font-semibold text-slate-600 w-10 text-right">
                                  {averagePercent}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedStudentId(student.id)}
                                className="rounded-lg text-slate-500 hover:text-primary text-xs font-semibold"
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
                  {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab 4: Manage Lessons ── */}
        <TabsContent value="lessons">
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-emerald-600" />
                <h2 className="text-2xl font-bold">Lesson Management</h2>
              </div>
              <div className="flex items-center gap-2.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchLessons}
                  disabled={lessonsLoading}
                  className="rounded-xl border"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${lessonsLoading ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setBulkLessonOpen(true)}
                  className="rounded-xl flex items-center gap-2 font-semibold text-xs sm:text-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Import CSV
                </Button>
                <Button
                  onClick={() => {
                    setLessonError("");
                    setLessonForm({ id: "", title: "", icon: "", sortOrder: lessons.length + 1, words: [], externalLinks: [] });
                    setLessonCreateOpen(true);
                  }}
                  className="rounded-xl flex items-center gap-2 font-bold"
                >
                  <Plus className="w-4 h-4" />
                  New Lesson
                </Button>
              </div>
            </div>

            {lessonsLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Loading lessons...</span>
              </div>
            ) : lessons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <BookOpen className="w-10 h-10 opacity-30" />
                <p className="font-medium">No lessons yet.</p>
                <div className="flex items-center gap-2.5 mt-2">
                  <Button variant="outline" onClick={fetchLessons} className="rounded-xl">
                    Load Lessons
                  </Button>
                  <Button
                    onClick={() => setBulkLessonOpen(true)}
                    className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Import from CSV
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {lessons.map((lesson) => (
                  <Card key={lesson.id} className="border border-slate-200 rounded-2xl overflow-hidden hover:shadow-sm transition-shadow">
                    <CardHeader className="bg-slate-50 p-4 pb-3 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-bold text-slate-800">{lesson.title}</CardTitle>
                        </div>
                        <Badge className="rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
                          Order: {lesson.sortOrder}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="text-xs text-slate-500 font-semibold space-y-0.5">
                        <p>{lesson.wordCount || 0} Word{(lesson.wordCount ?? 0) !== 1 ? "s" : ""}</p>
                        <p>{lesson.linkCount || 0} External Link{(lesson.linkCount ?? 0) !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => router.push(`/admin/lessons/${lesson.id}/edit?from=${encodeURIComponent(`/${appSlug}/admin`)}`)}
                          className="h-8 w-8 text-slate-400 hover:text-primary rounded-lg"
                          title="Edit Lesson"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setLessonTarget(lesson);
                            setLessonDeleteOpen(true);
                          }}
                          className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-lg"
                          title="Delete Lesson"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Create User Account Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create User Account</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account">Account ID (Login Number)</Label>
              <div className="flex items-center rounded-xl border border-input overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0 bg-white">
                <Input
                  id="account"
                  placeholder="e.g. 12345"
                  value={createForm.account}
                  onChange={(e) => setCreateForm((f) => ({ ...f, account: e.target.value.replace(/@.*/, "") }))}
                  className="rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
                />
                <span className="px-3 py-2 text-sm text-slate-400 font-medium bg-slate-50 border-l border-input select-none whitespace-nowrap">@uni.edu.com</span>
              </div>
              <p className="text-xs text-slate-400">Just enter the number — the email will be <span className="font-semibold text-slate-500">account@uni.edu.com</span></p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="username">Full Name (Display Name)</Label>
              <Input
                id="username"
                placeholder="e.g. John Doe"
                value={createForm.username}
                onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Login Password (min 6 chars)</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Account Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createError && (
              <p className="text-sm text-rose-500 font-medium">{createError}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl" disabled={createLoading}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit} disabled={createLoading} className="rounded-xl font-bold">
              {createLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              {createLoading ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Account Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit User Account</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-1.5">
                <Label>Account ID (ReadOnly)</Label>
                <Input
                  value={editTarget.email.replace("@uni.edu.com", "")}
                  disabled
                  className="rounded-xl bg-slate-50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="editUsername">Display Name</Label>
                <Input
                  id="editUsername"
                  value={editForm.username}
                  onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Role</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, role: v }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editError && (
                <p className="text-sm text-rose-500 font-medium">{editError}</p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl" disabled={editLoading}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={editLoading} className="rounded-xl font-bold">
              {editLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Student Progress Detail Dialog ── */}
      <Dialog open={!!selectedStudentId} onOpenChange={(open) => { if (!open) setSelectedStudentId(null); }}>
        <DialogContent className="rounded-3xl sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedStudent?.username ?? "Student"} — Lesson Progress
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1">
            <div className="flex flex-col gap-3 py-2">
              {lessons.map((lesson) => {
                const record = selectedStudentId ? (allProgress[selectedStudentId]?.[lesson.id] ?? null) : null;
                const pct = record ? calculateLessonPercentage(record, lesson) : 0;
                const statusLabel = pct === 100 ? "Completed" : pct > 0 ? "In Progress" : "Not Started";
                const statusColor =
                  pct === 100
                    ? "bg-emerald-100 text-emerald-700"
                    : pct > 0
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-400";
                return (
                  <div key={lesson.id} className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">{lesson.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">{pct}%</span>
                        <Badge className={`rounded-full text-xs px-2 ${statusColor} hover:${statusColor}`}>
                          {statusLabel}
                        </Badge>
                      </div>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setSelectedStudentId(null)} className="rounded-xl w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Lesson Dialog ── */}
      <Dialog open={lessonCreateOpen} onOpenChange={setLessonCreateOpen}>
        <DialogContent className="rounded-3xl sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create New Lesson</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1">
            <LessonFormFields form={lessonForm} setForm={setLessonForm} />
            {lessonError && <p className="text-sm text-rose-500 font-medium mt-2">{lessonError}</p>}
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setLessonCreateOpen(false)} className="rounded-xl" disabled={lessonSaving}>Cancel</Button>
            <Button
              onClick={async () => {
                setLessonError("");
                if (!lessonForm.id.trim()) { setLessonError("Lesson ID is required."); return; }
                if (!lessonForm.title.trim()) { setLessonError("Title is required."); return; }
                setLessonSaving(true);
                try {
                  await createLesson({ id: lessonForm.id.trim(), title: lessonForm.title.trim(), icon: lessonForm.icon, sortOrder: lessonForm.sortOrder, words: lessonForm.words, externalLinks: lessonForm.externalLinks });
                  setLessonCreateOpen(false);
                  await fetchLessons();
                } catch (err: any) {
                  setLessonError(err.message ?? "Failed to create lesson.");
                } finally { setLessonSaving(false); }
              }}
              disabled={lessonSaving}
              className="rounded-xl font-bold"
            >
              {lessonSaving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              {lessonSaving ? "Creating..." : "Create Lesson"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Lesson Dialog ── */}
      <AlertDialog open={lessonDeleteOpen} onOpenChange={setLessonDeleteOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{lessonTarget?.title}</strong>? This removes all its words and external links.
              Student progress records referencing this lesson will be preserved but the lesson will no longer appear.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={lessonDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!lessonTarget) return;
                setLessonDeleting(true);
                try {
                  await deleteLesson(lessonTarget.id);
                  setLessonDeleteOpen(false);
                  setLessonTarget(null);
                  await fetchLessons();
                } catch (err) {
                  console.error("Failed to delete lesson:", err);
                } finally { setLessonDeleting(false); }
              }}
              disabled={lessonDeleting}
              className="rounded-xl bg-rose-500 hover:bg-rose-600 font-bold"
            >
              {lessonDeleting ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              {lessonDeleting ? "Deleting..." : "Delete Lesson"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.username}</strong> (
              {deleteTarget?.email.replace("@uni.edu.com", "")})?{" "}
              This removes their profile and app access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            {deleteError && (
              <p className="text-sm text-rose-500 font-medium w-full text-left mb-2">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={() => setDeleteOpen(false)} className="rounded-xl" disabled={deleteLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold"
              >
                {deleteLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                {deleteLoading ? "Deleting..." : "Delete Account"}
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* ── Bulk Import Lessons Dialog ── */}
      <ImportLessonsDialog
        open={bulkLessonOpen}
        onOpenChange={setBulkLessonOpen}
        onSuccess={fetchLessons}
      />
    </main>
  );
}
