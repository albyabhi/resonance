import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { AlertCircle, CheckCircle, Loader2, Save, Upload } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const EditHouse = () => {
  const { token, role, user, setUserHouse } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [groupId, setGroupId] = useState("");
  const [previewOk, setPreviewOk] = useState(true);

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body,
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");
        if (String(role || "").toLowerCase() !== "captain") throw new Error("Only captains can edit group details");

        const groupData = user?.house;
        if (groupData?._id) {
          setGroupId(groupData._id);
          setName(groupData.name || "");
          setLogoUrl(groupData.logoUrl || "");
          setUserHouse(groupData);
        } else {
          throw new Error("No group assigned to this captain");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token, role, user?.house?._id]);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      if (!name.trim()) throw new Error("Group name is required");
      if (!groupId) throw new Error("Group ID not found");

      const payload = {
        name: name.trim(),
        logoUrl: typeof logoUrl === "string" ? logoUrl.trim() : "",
      };

      const updatedGroup = await apiCall(`/api/competition/groups/${groupId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setName(updatedGroup.name || "");
      setLogoUrl(updatedGroup.logoUrl || "");
      setUserHouse(updatedGroup);
      setSuccess("Group updated successfully.");
    } catch (err) {
      if (String(err.message || "").toLowerCase().includes("already exists")) {
        setError("Group name already exists. Choose a different name.");
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Manage Group Logo</CardTitle>
        </div>
        <CardDescription>Update your group logo URL.</CardDescription>
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
          <form onSubmit={onSubmit} className="space-y-4">
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

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Logo URL <span className="text-muted-foreground/60">(optional)</span>
              </label>
              <Input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              {logoUrl ? (
                <div className="mt-2">
                  <div className="mb-1 text-xs text-muted-foreground">Preview</div>
                  <div className={`bg-muted flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg border ${previewOk ? "border-border" : "border-accent-red/30"}`}>
                    <img
                      src={logoUrl}
                      alt="Group logo preview"
                      className="h-full w-full object-contain"
                      onError={() => setPreviewOk(false)}
                      onLoad={() => setPreviewOk(true)}
                    />
                  </div>
                  {!previewOk && (
                    <p className="mt-1 text-xs text-accent-red">
                      <AlertCircle className="inline h-3 w-3 mr-0.5" />
                      Failed to load image. Check the URL.
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default EditHouse;
