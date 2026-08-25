import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../AuthContext";
import { apiFetch, apiJson } from "../../utils/apiClient";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import {
  AlertCircle, CheckCircle, ImagePlus, Loader2, Trash2,
  UploadCloud, X,
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
const MAX_LOGO_MB = 5;
const LOGO_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

const formatSize = (bytes) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

const EditHouse = () => {
  const { token, role, user, setUserHouse } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [groupId, setGroupId] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Two-step staging: selected file is previewed first, then uploaded explicitly
  const [staged, setStaged] = useState(null); // { file, previewUrl }
  const fileInputRef = useRef(null);

  const isCaptain = ["captain", "house_captain"].includes(
    String(role || "").toLowerCase()
  );

  const applyGroup = useCallback(
    (group) => {
      if (!group) return;
      setName(group.name || "");
      setLogoUrl(group.logoUrl || "");
      if (user?.house?._id === group._id || !group._id) {
        setUserHouse({ ...(user?.house || {}), ...group });
      }
    },
    [user?.house, setUserHouse]
  );

  // Load the authoritative group data (name + saved logo) from the server.
  // Self-contained effect: no context writes here, so no re-render loops.
  useEffect(() => {
    if (!token) return;
    if (!isCaptain) {
      setError("Only captains can edit group details");
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");
        const resp = await apiJson(`${API_BASE_URL}/api/captain/my-group`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        const groupData = resp?.data || null;
        if (groupData?._id) {
          setGroupId(groupData._id);
          setName(groupData.name || "");
          setLogoUrl(groupData.logoUrl || "");
        } else {
          setError("No group assigned to this captain");
        }
      } catch (err) {
        if (!cancelled)
          setError(err.message || "Failed to load group details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token, isCaptain]);

  // Revoke staged object URLs on unmount
  useEffect(() => {
    return () => {
      if (staged?.previewUrl) URL.revokeObjectURL(staged.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearStaged = useCallback(() => {
    setStaged((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const stageFile = useCallback(
    (file) => {
      setError("");
      setSuccess("");
      if (!file) return;
      if (!groupId) {
        toast.error("No group assigned. Please reload this page.");
        return;
      }
      if (!/image\/(png|jpe?g|webp|svg\+xml)/i.test(file.type)) {
        toast.error("Only PNG, JPG, WEBP, or SVG images are allowed");
        return;
      }
      if (file.size > MAX_LOGO_MB * 1024 * 1024) {
        toast.error(`Image must be ${MAX_LOGO_MB}MB or smaller`);
        return;
      }
      setStaged((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return { file, previewUrl: URL.createObjectURL(file) };
      });
    },
    [groupId]
  );

  const confirmUpload = async () => {
    if (!staged?.file) return;
    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const fd = new FormData();
      fd.append("logo", staged.file);

      const response = await apiFetch(
        `${API_BASE_URL}/api/competition/groups/${groupId}/logo`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.message || data?.error || "Failed to upload logo");

      applyGroup(data);
      setSuccess("Group logo updated.");
      toast.success("Group logo updated");
      clearStaged();
    } catch (err) {
      const msg = err.message || "Failed to upload logo";
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    if (!groupId) {
      toast.error("No group assigned. Please reload this page.");
      return;
    }
    try {
      setRemoving(true);
      setError("");
      setSuccess("");

      const response = await apiFetch(
        `${API_BASE_URL}/api/competition/groups/${groupId}/logo`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.message || data?.error || "Failed to remove logo");

      applyGroup(data);
      setSuccess("Group logo removed.");
      toast.success("Group logo removed");
    } catch (err) {
      const msg = err.message || "Failed to remove logo";
      setError(msg);
      toast.error(msg);
    } finally {
      setRemoving(false);
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) stageFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (uploading || removing) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) stageFile(file);
  };

  const dragHandlers = {
    onDragOver: (e) => {
      e.preventDefault();
      if (!uploading && !removing) setDragActive(true);
    },
    onDragLeave: () => setDragActive(false),
    onDrop,
  };

  const busy = uploading || removing;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Manage Group Logo</CardTitle>
        </div>
        <CardDescription>
          Drag and drop an image, or click to browse. Max size {MAX_LOGO_MB}MB
          (PNG, JPG, WEBP, SVG).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg border border-accent-red/20 bg-accent-red/10 px-3 py-2 text-accent-red text-sm">
            <AlertCircle className="inline h-4 w-4 mr-1" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-accent-green/20 bg-accent-green/10 px-3 py-2 text-accent-green text-sm">
            <CheckCircle className="inline h-4 w-4 mr-1" />
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-3 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Group Name</p>
                <p className="font-medium text-card-foreground">{name || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Group Code</p>
                <p className="font-medium text-card-foreground">{name ? name.substring(0, 3).toUpperCase() : "-"}</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={LOGO_ACCEPT}
              className="hidden"
              onChange={onFileChange}
            />

            {staged ? (
              /* Step 2: preview staged image, explicit upload */
              <div
                className={`rounded-xl border-2 border-dashed p-6 transition-colors ${
                  dragActive ? "border-primary bg-primary/5" : "border-primary/40"
                }`}
                {...dragHandlers}
              >
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
                  <div className="bg-muted h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-border">
                    <img
                      src={staged.previewUrl}
                      alt="Selected logo preview"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="truncate text-sm font-semibold text-card-foreground" title={staged.file.name}>
                      {staged.file.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatSize(staged.file.size)} &middot; ready to upload
                    </p>
                    {logoUrl && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        This will replace your current logo.
                      </p>
                    )}
                  </div>
                </div>

                {uploading ? (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
                  </div>
                ) : (
                  <div className="mt-4 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={confirmUpload}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      <UploadCloud className="h-4 w-4" /> Upload Logo
                    </button>
                    <button
                      type="button"
                      onClick={clearStaged}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-5 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50"
                    >
                      <X className="h-4 w-4" /> Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : removing ? (
              /* Removing in progress */
              <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-10 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Removing...
              </div>
            ) : logoUrl ? (
              /* Current logo */
              <div
                className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors ${
                  dragActive ? "border-primary bg-primary/5" : "border-border"
                }`}
                {...dragHandlers}
              >
                <div className="bg-muted h-28 w-28 overflow-hidden rounded-lg border border-border">
                  <img
                    src={logoUrl}
                    alt="Group logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Drop a new image here or use the buttons below to change it
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={removeLogo}
                    disabled={busy}
                    className="flex items-center gap-1 rounded-md border border-accent-red/30 px-3 py-1.5 text-xs font-semibold text-accent-red hover:bg-accent-red/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              /* Empty dropzone */
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                {...dragHandlers}
                className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/40"
                } disabled:opacity-60`}
              >
                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-semibold text-card-foreground">
                  Drag &amp; drop your group logo here
                </span>
                <span className="text-xs text-muted-foreground">
                  or click to browse &middot; PNG, JPG, WEBP, SVG &middot; max{" "}
                  {MAX_LOGO_MB}MB
                </span>
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EditHouse;
