"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Plus,
  Trash2,
  Upload,
  RefreshCw,
  LogOut,
  User,
  Shield,
  Layers,
  Settings,
  Pencil,
  PlusCircle,
  FileImage,
  KeyRound,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  loginSuperAdmin,
  listApps,
  createApp,
  updateApp,
  uploadAppLogo,
  deleteApp,
  assignAdminToApp,
  listAppAdmins,
  updateAppAdmin,
  deleteAppAdmin,
  signOutUser,
  checkAuthState,
  AppRecord,
  AdminRecord,
  StoredUser
} from "@/lib/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL!;

export default function SuperadminPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [authLoading, setAuthLoading] = useState(true);
  const [superadmin, setSuperadmin] = useState<StoredUser | null>(null);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // App management state
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  // Create App Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [appName, setAppName] = useState("");
  const [appSlug, setAppSlug] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit App Modal
  const [editOpen, setEditOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete App Confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingApp, setDeletingApp] = useState<AppRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Assign Admin Modal
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminApp, setAdminApp] = useState<AppRecord | null>(null);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  // Manage Admins Modal
  const [manageAdminsOpen, setManageAdminsOpen] = useState(false);
  const [manageAdminsApp, setManageAdminsApp] = useState<AppRecord | null>(null);
  const [adminsList, setAdminsList] = useState<AdminRecord[]>([]);
  const [adminsListLoading, setAdminsListLoading] = useState(false);

  // Edit Admin Sub-dialog
  const [editAdminOpen, setEditAdminOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminRecord | null>(null);
  const [editAdminUsername, setEditAdminUsername] = useState("");
  const [editAdminEmail, setEditAdminEmail] = useState("");
  const [editAdminPassword, setEditAdminPassword] = useState("");
  const [editAdminLoading, setEditAdminLoading] = useState(false);
  const [editAdminError, setEditAdminError] = useState("");

  // Delete Admin Confirmation
  const [deleteAdminOpen, setDeleteAdminOpen] = useState(false);
  const [deletingAdmin, setDeletingAdmin] = useState<AdminRecord | null>(null);
  const [deleteAdminLoading, setDeleteAdminLoading] = useState(false);
  const [deleteAdminError, setDeleteAdminError] = useState("");

  // Logo upload state
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogoAppId, setUploadingLogoAppId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = checkAuthState((user) => {
      if (user && user.isSuperAdmin) {
        setSuperadmin(user);
        fetchApps();
      } else {
        setSuperadmin(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchApps = async () => {
    setAppsLoading(true);
    try {
      const res = await listApps();
      setApps(res.apps);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message ?? "Failed to fetch apps list.",
      });
    } finally {
      setAppsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const user = await loginSuperAdmin(email.trim(), password);
      if (user.isSuperAdmin) {
        setSuperadmin(user);
        fetchApps();
        toast({
          title: "Welcome Back",
          description: "Super Admin portal unlocked.",
        });
      } else {
        setLoginError("Access denied. Not a super admin.");
        signOutUser();
      }
    } catch (err: any) {
      setLoginError(err.message ?? "Invalid email or password.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    signOutUser();
    setSuperadmin(null);
    toast({
      title: "Signed Out",
      description: "You have been signed out.",
    });
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!appName.trim() || !appSlug.trim()) {
      setCreateError("All fields are required.");
      return;
    }

    setCreateLoading(true);
    try {
      await createApp({ name: appName.trim(), slug: appSlug.trim() });
      setCreateOpen(false);
      setAppName("");
      setAppSlug("");
      toast({
        title: "Success",
        description: `App "${appName}" created successfully.`,
      });
      fetchApps();
    } catch (err: any) {
      setCreateError(err.message ?? "Failed to create app.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;
    setEditError("");

    if (!editName.trim() || !editSlug.trim()) {
      setEditError("All fields are required.");
      return;
    }

    setEditLoading(true);
    try {
      await updateApp(editingApp.id, { name: editName.trim(), slug: editSlug.trim() });
      setEditOpen(false);
      toast({
        title: "Success",
        description: "App configuration updated.",
      });
      fetchApps();
    } catch (err: any) {
      setEditError(err.message ?? "Failed to update app.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteAppConfirm = async () => {
    if (!deletingApp) return;
    setDeleteError("");
    setDeleteLoading(true);

    try {
      await deleteApp(deletingApp.id);
      setDeleteOpen(false);
      setDeletingApp(null);
      toast({
        title: "Success",
        description: "App deleted successfully.",
      });
      fetchApps();
    } catch (err: any) {
      setDeleteError(err.message ?? "Failed to delete app.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminApp) return;
    setAdminError("");

    if (!adminUsername.trim() || !adminEmail.trim() || !adminPassword) {
      setAdminError("All fields are required.");
      return;
    }

    setAdminLoading(true);
    try {
      await assignAdminToApp(adminApp.id, {
        username: adminUsername.trim(),
        email: adminEmail.trim(),
        password: adminPassword
      });
      setAdminOpen(false);
      setAdminUsername("");
      setAdminEmail("");
      setAdminPassword("");
      toast({
        title: "Success",
        description: `Admin assigned to "${adminApp.name}" successfully.`,
      });
      // Refresh admins list if manage dialog is open for the same app
      if (manageAdminsApp?.id === adminApp.id) {
        fetchAdminsForApp(adminApp.id);
      }
    } catch (err: any) {
      setAdminError(err.message ?? "Failed to create app admin.");
    } finally {
      setAdminLoading(false);
    }
  };

  const fetchAdminsForApp = async (appId: string) => {
    setAdminsListLoading(true);
    try {
      const res = await listAppAdmins(appId);
      setAdminsList(res.admins);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message ?? "Failed to fetch admins.",
      });
    } finally {
      setAdminsListLoading(false);
    }
  };

  const openManageAdmins = (app: AppRecord) => {
    setManageAdminsApp(app);
    setAdminsList([]);
    setManageAdminsOpen(true);
    fetchAdminsForApp(app.id);
  };

  const openAddAdminInManage = () => {
    if (!manageAdminsApp) return;
    setAdminApp(manageAdminsApp);
    setAdminUsername("");
    setAdminEmail("");
    setAdminPassword("");
    setAdminError("");
    setAdminOpen(true);
  };

  const handleEditAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin || !manageAdminsApp) return;
    setEditAdminError("");

    if (!editAdminUsername.trim() || !editAdminEmail.trim()) {
      setEditAdminError("Name and email are required.");
      return;
    }

    setEditAdminLoading(true);
    try {
      const payload: { username: string; email: string; password?: string } = {
        username: editAdminUsername.trim(),
        email: editAdminEmail.trim(),
      };
      if (editAdminPassword) payload.password = editAdminPassword;

      await updateAppAdmin(manageAdminsApp.id, editingAdmin.id, payload);
      setEditAdminOpen(false);
      setEditingAdmin(null);
      toast({
        title: "Success",
        description: "Admin updated successfully.",
      });
      fetchAdminsForApp(manageAdminsApp.id);
    } catch (err: any) {
      setEditAdminError(err.message ?? "Failed to update admin.");
    } finally {
      setEditAdminLoading(false);
    }
  };

  const handleDeleteAdminConfirm = async () => {
    if (!deletingAdmin || !manageAdminsApp) return;
    setDeleteAdminError("");
    setDeleteAdminLoading(true);
    try {
      await deleteAppAdmin(manageAdminsApp.id, deletingAdmin.id);
      setDeleteAdminOpen(false);
      setDeletingAdmin(null);
      toast({
        title: "Success",
        description: "Admin removed successfully.",
      });
      fetchAdminsForApp(manageAdminsApp.id);
    } catch (err: any) {
      setDeleteAdminError(err.message ?? "Failed to delete admin.");
    } finally {
      setDeleteAdminLoading(false);
    }
  };

  const triggerLogoUpload = (appId: string) => {
    setUploadingLogoAppId(appId);
    setTimeout(() => logoInputRef.current?.click(), 0);
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!uploadingLogoAppId || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const targetAppId = uploadingLogoAppId;

    // 1. Client-side extension and MIME validation
    const validExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    const isImageMime = file.type.startsWith("image/");

    if (!validExtensions.includes(fileExt) && !isImageMime) {
      toast({
        variant: "destructive",
        title: "Unsupported Image Format",
        description: `"${file.name}" is not a supported image. Please upload a PNG, JPG, or WEBP file.`,
      });
      if (logoInputRef.current) logoInputRef.current.value = "";
      setUploadingLogoAppId(null);
      return;
    }

    // 2. Client-side file size validation (5MB max)
    const MAX_SIZE_MB = 5;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast({
        variant: "destructive",
        title: "Image File Too Large",
        description: `The selected image is ${fileSizeMB}MB, which exceeds the ${MAX_SIZE_MB}MB maximum upload limit.`,
      });
      if (logoInputRef.current) logoInputRef.current.value = "";
      setUploadingLogoAppId(null);
      return;
    }

    // 3. Perform upload with contextual error toasts
    try {
      await uploadAppLogo(targetAppId, file);
      toast({
        title: "Logo Updated Successfully",
        description: `New logo applied. Changes will appear across student and admin portals.`,
      });
      fetchApps();
    } catch (err: any) {
      console.error("Logo upload error:", err);
      let errorTitle = "Logo Upload Failed";
      let errorDescription = err.message ?? "An unexpected error occurred during upload.";

      if (err.status === 401 || err.status === 403) {
        errorTitle = "Session Expired";
        errorDescription = "Your superadmin authorization has expired. Please sign in again.";
      } else if (err.status === 404) {
        errorTitle = "Application Not Found";
        errorDescription = "The target application record could not be found on the server.";
      } else if (err.message && err.message.toLowerCase().includes("failed to fetch")) {
        errorTitle = "Network Error";
        errorDescription = `Cannot reach backend server at ${BASE_URL || "configured URL"}. Please ensure the server is active.`;
      }

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorDescription,
      });
    } finally {
      setUploadingLogoAppId(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-lg font-bold text-slate-500 animate-pulse">
            Verifying Super User Status...
          </p>
        </div>
      </div>
    );
  }

  // ─── Super Admin NOT logged in ──────────────────────────────────────────────
  if (!superadmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl rounded-3xl bg-white overflow-hidden">
          <div className="bg-indigo-600 px-6 py-8 text-center text-white">
            <div className="inline-flex p-3 bg-indigo-500/30 rounded-2xl mb-3">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Super Admin Portal</CardTitle>
            <CardDescription className="text-indigo-100 mt-1">
              Authorized access only. Enter platform credentials.
            </CardDescription>
          </div>
          <CardContent className="p-6 pt-8">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium rounded-xl">
                  {loginError}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@platform.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10.5 rounded-xl border-slate-200"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Security Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10.5 rounded-xl border-slate-200"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full h-12 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                    Authenticating...
                  </>
                ) : (
                  "Unlock Platform Controls"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  // ─── Super Admin Logged In Dashboard ──────────────────────────────────────
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hidden file input for logo uploads */}
      <input
        type="file"
        ref={logoInputRef}
        onChange={logoFileChange => handleLogoFileChange(logoInputRef.current?.files ? { target: logoInputRef.current } as any : logoFileChange)}
        className="hidden"
        accept="image/*"
      />

      {/* Branded Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">LMS Platform Hub</h1>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Super Administrator</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-700">{superadmin.username}</p>
              <p className="text-xs text-slate-400">{superadmin.email}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 flex items-center gap-2 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-600"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">Manage Tenant Applications</h2>
            <p className="text-slate-500 mt-1">Deploy, configure, and brand application scopes for different organizations.</p>
          </div>
          <Button
            onClick={() => {
              setCreateError("");
              setCreateOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-5 h-12 shadow-sm flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Deploy New Application
          </Button>
        </div>

        {appsLoading ? (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-slate-400 font-medium">Refreshing application states...</p>
            </div>
          </div>
        ) : apps.length === 0 ? (
          <Card className="border border-dashed border-slate-300 rounded-3xl py-16 text-center">
            <CardContent className="flex flex-col items-center gap-4">
              <div className="p-4 bg-slate-100 rounded-full text-slate-400">
                <Layers className="w-12 h-12" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">No applications deployed</h3>
                <p className="text-slate-500 max-w-sm mt-1 mx-auto">Create your first application profile to begin managing students and admins.</p>
              </div>
              <Button onClick={() => setCreateOpen(true)} className="rounded-xl mt-2">
                Deploy Now
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {apps.map((app) => (
              <Card key={app.id} className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden relative shrink-0">
                        {app.logo_path ? (
                          <img
                            src={`${BASE_URL}/${app.logo_path}`}
                            alt={app.name}
                            className="object-contain w-full h-full p-1"
                          />
                        ) : (
                          <FileImage className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-800">{app.name}</CardTitle>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-500">/{app.slug}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold">
                      {app.user_count ?? 0} Account{app.user_count !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 flex flex-col justify-between h-40">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerLogoUpload(app.id)}
                      className="rounded-lg text-xs font-semibold border-slate-200 flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {app.logo_path ? "Change Logo" : "Upload Logo"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openManageAdmins(app)}
                      className="rounded-lg text-xs font-semibold border-slate-200 flex items-center gap-1.5"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Manage Admins
                    </Button>
                    <a
                      href={`/${app.slug}?preview=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-xs font-semibold border-slate-200 flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Visit App
                      </Button>
                    </a>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingApp(app);
                          setEditName(app.name);
                          setEditSlug(app.slug);
                          setEditError("");
                          setEditOpen(true);
                        }}
                        className="text-slate-500 hover:text-indigo-600 h-8 px-2.5 rounded-lg flex items-center gap-1.5"
                      >
                        <Pencil className="w-4 h-4" />
                        Configure
                      </Button>
                      {app.id !== "default" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingApp(app);
                            setDeleteError("");
                            setDeleteOpen(true);
                          }}
                          className="text-slate-500 hover:text-rose-600 h-8 px-2.5 rounded-lg flex items-center gap-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      )}
                    </div>
                    <a
                      href={`/admin?slug=${app.slug}`}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                    >
                      Login to Admin
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── CREATE APP DIALOG ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Deploy Application Scope</DialogTitle>
            <DialogDescription>
              Assign a custom identity and url prefix for this client instance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateApp} className="space-y-4 py-2">
            {createError && (
              <p className="text-sm text-rose-500 font-medium">{createError}</p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="appName">App Name</Label>
              <Input
                id="appName"
                placeholder="e.g. Primary School A"
                value={appName}
                onChange={(e) => {
                  setAppName(e.target.value);
                  // Auto-generate slug
                  setAppSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                }}
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appSlug">URL Slug (lowercase, dashes)</Label>
              <div className="flex items-center">
                <span className="bg-slate-100 border border-r-0 border-slate-200 px-3 py-2 rounded-l-xl text-sm font-semibold text-slate-400">/</span>
                <Input
                  id="appSlug"
                  placeholder="primary-school-a"
                  value={appSlug}
                  onChange={(e) => setAppSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ""))}
                  className="rounded-r-xl rounded-l-none"
                  required
                />
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl" disabled={createLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading} className="rounded-xl font-bold">
                {createLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                {createLoading ? "Deploying..." : "Deploy App"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT APP DIALOG ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Configure Application Scope</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditApp} className="space-y-4 py-2">
            {editError && (
              <p className="text-sm text-rose-500 font-medium">{editError}</p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="editName">App Name</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editSlug">URL Slug</Label>
              <div className="flex items-center">
                <span className="bg-slate-100 border border-r-0 border-slate-200 px-3 py-2 rounded-l-xl text-sm font-semibold text-slate-400">/</span>
                <Input
                  id="editSlug"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ""))}
                  className="rounded-r-xl rounded-l-none"
                  required
                />
              </div>
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl" disabled={editLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading} className="rounded-xl font-bold">
                {editLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                {editLoading ? "Saving Changes..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MANAGE ADMINS DIALOG ── */}
      <Dialog open={manageAdminsOpen} onOpenChange={setManageAdminsOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Admins for &ldquo;{manageAdminsApp?.name}&rdquo;
            </DialogTitle>
            <DialogDescription>
              View, edit, or remove administrators for this application.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            {adminsListLoading ? (
              <div className="flex justify-center py-6">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
              </div>
            ) : adminsList.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm font-medium">
                No admins assigned yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {adminsList.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{admin.username}</p>
                      <p className="text-xs text-slate-400">{admin.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingAdmin(admin);
                          setEditAdminUsername(admin.username);
                          setEditAdminEmail(admin.email);
                          setEditAdminPassword("");
                          setEditAdminError("");
                          setEditAdminOpen(true);
                        }}
                        className="h-8 px-2.5 rounded-lg text-slate-500 hover:text-indigo-600 flex items-center gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingAdmin(admin);
                          setDeleteAdminError("");
                          setDeleteAdminOpen(true);
                        }}
                        className="h-8 px-2.5 rounded-lg text-slate-500 hover:text-rose-600 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setManageAdminsOpen(false)}
              className="rounded-xl"
            >
              Close
            </Button>
            <Button
              onClick={openAddAdminInManage}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Add Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT ADMIN DIALOG ── */}
      <Dialog open={editAdminOpen} onOpenChange={setEditAdminOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Administrator</DialogTitle>
            <DialogDescription>
              Update the name, email, or password for this admin account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAdminSubmit} className="space-y-4 py-2">
            {editAdminError && (
              <p className="text-sm text-rose-500 font-medium">{editAdminError}</p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="editAdminUsername">Display Name</Label>
              <Input
                id="editAdminUsername"
                value={editAdminUsername}
                onChange={(e) => setEditAdminUsername(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editAdminEmail">Email Address</Label>
              <Input
                id="editAdminEmail"
                type="email"
                value={editAdminEmail}
                onChange={(e) => setEditAdminEmail(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editAdminPassword">New Password <span className="text-slate-400 font-normal">(leave blank to keep current)</span></Label>
              <Input
                id="editAdminPassword"
                type="password"
                placeholder="••••••••"
                value={editAdminPassword}
                onChange={(e) => setEditAdminPassword(e.target.value)}
                className="rounded-xl"
                minLength={editAdminPassword ? 6 : undefined}
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditAdminOpen(false)} className="rounded-xl" disabled={editAdminLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={editAdminLoading} className="rounded-xl font-bold">
                {editAdminLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                {editAdminLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DELETE ADMIN CONFIRMATION DIALOG ── */}
      <Dialog open={deleteAdminOpen} onOpenChange={setDeleteAdminOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-rose-600">Remove Administrator</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{deletingAdmin?.username}</strong> ({deletingAdmin?.email}) as an admin? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {deleteAdminError && (
              <p className="text-sm text-rose-500 font-medium">{deleteAdminError}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteAdminOpen(false)} className="rounded-xl" disabled={deleteAdminLoading}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteAdminConfirm}
              disabled={deleteAdminLoading}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {deleteAdminLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              {deleteAdminLoading ? "Removing..." : "Remove Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD ADMIN DIALOG (opened from Manage Admins) ── */}
      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add App Administrator</DialogTitle>
            <DialogDescription>
              Create a new admin account for <strong>{adminApp?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAdmin} className="space-y-4 py-2">
            {adminError && (
              <p className="text-sm text-rose-500 font-medium">{adminError}</p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="adminUsername">Admin Display Name</Label>
              <Input
                id="adminUsername"
                placeholder="e.g. Principal Jane"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adminEmail">Admin Account Email</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="e.g. admin@school.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adminPassword">Admin Account Password (min 6 chars)</Label>
              <Input
                id="adminPassword"
                type="password"
                placeholder="••••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAdminOpen(false)} className="rounded-xl" disabled={adminLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={adminLoading} className="rounded-xl font-bold">
                {adminLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                {adminLoading ? "Creating Admin..." : "Add Admin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DELETE APP CONFIRMATION DIALOG ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-rose-600">Delete Application Scope</DialogTitle>
            <DialogDescription>
              Are you sure you want to completely delete <strong>{deletingApp?.name}</strong>?
              This will immediately purge all users, lessons config, and progress scoped to this app.
              <strong>This action cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {deleteError && (
              <p className="text-sm text-rose-500 font-medium">{deleteError}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} className="rounded-xl" disabled={deleteLoading}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteAppConfirm}
              disabled={deleteLoading}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {deleteLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              {deleteLoading ? "Deleting..." : "Permanently Delete Scope"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
