import { useState, useEffect } from "react";
import { Upload, RotateCcw, Save, AlertCircle, CheckCircle, User, Mail, Shield, Lock, Phone, Hash, BookOpen, CreditCard } from "lucide-react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function ProfileSettings() {
  const { token, setUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    if (!token) return;
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiJson(`${API_BASE_URL}/api/profile/me`);
        setProfile(data.user);
        setName(data.user.name || "");
        setPhone(data.user.phone || "");
        setPhoneVisible(data.user.phone_visible || false);
      } catch (err) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [token]);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image size must be less than 2MB");
      return;
    }
    setSelectedImage(file);
    setRemoveImage(false);
    const reader = new FileReader();
    reader.onload = (event) => setImagePreview(event.target?.result);
    reader.readAsDataURL(file);
    setError("");
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setRemoveImage(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (password && password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("phone", phone.trim() || "");
      formData.append("phone_visible", phoneVisible);
      if (password) formData.append("password", password);
      if (removeImage) formData.append("remove_profile_image", "true");
      if (selectedImage) formData.append("profile_image", selectedImage);

      const data = await apiJson(`${API_BASE_URL}/api/profile/me`, {
        method: "PATCH",
        body: formData,
      });

      setProfile(data.user);
      setName(data.user.name || "");
      setPhone(data.user.phone || "");
      setPhoneVisible(data.user.phone_visible || false);
      setSelectedImage(null);
      setImagePreview(null);
      setRemoveImage(false);
      setPassword("");

      setUserData({
        name: data.user.name,
        email: data.user.email,
        profile_image: data.user.profile_image,
      });

      setSuccess("Profile updated successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Please log in to view your profile.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading profile...
        </CardContent>
      </Card>
    );
  }

  const isStaff = profile?.role !== "participant";
  const displayImage = imagePreview || (removeImage ? null : profile?.profile_image);

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <p className="text-sm text-muted-foreground">Manage your account information.</p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-accent-green/20 bg-accent-green-tint p-4 text-sm text-accent-green">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <section aria-label="Account">
            <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">Account</h3>
            <div className="space-y-5">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={displayImage} alt="Avatar" />
                  <AvatarFallback className="bg-muted">
                    <User className="h-10 w-10 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Label
                  htmlFor="profile-image-upload"
                  className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Upload className="h-4 w-4" />
                  <span>Choose Image</span>
                </Label>
                <input
                  id="profile-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={submitting}
                  className="hidden"
                />
                {profile?.profile_image && !removeImage && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveImage}
                    disabled={submitting}
                    className="min-h-[44px]"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Remove
                  </Button>
                )}
                {imagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setSelectedImage(null); setImagePreview(null); setRemoveImage(false); }}
                    disabled={submitting}
                    className="min-h-[44px]"
                  >
                    Cancel
                  </Button>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                PNG, JPG, WebP. Max 2MB.
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" /> Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                required
                placeholder="Your full name"
                className="min-h-[44px] text-base sm:text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> Email
              </Label>
              <Input
                id="email"
                type="email"
                value={profile?.email || ""}
                disabled
                className="opacity-70"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" /> Role
              </Label>
              <Input
                id="role"
                type="text"
                value={profile?.role || ""}
                disabled
                className="opacity-70 capitalize"
              />
            </div>

            {!isStaff && (profile?.class || profile?.admission_no || profile?.unique_id) && (
            <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Competition details (read-only)</p>
            {!isStaff && profile?.class && (
              <div className="space-y-2">
                <Label htmlFor="class" className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5" /> Class
                </Label>
                <Input
                  id="class"
                  type="text"
                  value={profile.class}
                  disabled
                  className="opacity-70"
                />
              </div>
            )}

            {!isStaff && profile?.admission_no && (
              <div className="space-y-2">
                <Label htmlFor="admission" className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5" /> Admission No.
                </Label>
                <Input
                  id="admission"
                  type="text"
                  value={profile.admission_no}
                  disabled
                  className="opacity-70"
                />
              </div>
            )}

            {!isStaff && profile?.unique_id && (
              <div className="space-y-2">
                <Label htmlFor="unique_id" className="flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5" /> Unique ID
                </Label>
                <Input
                  id="unique_id"
                  type="text"
                  value={profile.unique_id}
                  disabled
                  className="opacity-70"
                />
              </div>
            )}
            </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" /> Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={submitting}
                placeholder="Your phone number"
                className="min-h-[44px] text-base sm:text-sm"
              />
            </div>

            {isStaff && (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="phone_visible"
                  checked={phoneVisible}
                  onCheckedChange={(checked) => setPhoneVisible(!!checked)}
                  disabled={submitting}
                  className="mt-0.5 h-5 w-5"
                />
                <Label htmlFor="phone_visible" className="font-medium text-muted-foreground leading-snug">
                  Make phone number visible to others
                </Label>
              </div>
            )}
            </div>
            </section>

            <section aria-label="Security" className="border-t border-border pt-6">
            <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">Security</h3>
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5" /> New Password <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                placeholder="Leave blank to keep current"
                className="min-h-[44px] text-base sm:text-sm"
              />
              <p className="text-xs text-muted-foreground">Minimum 6 characters.</p>
            </div>
            </section>

            <Button
              type="submit"
              disabled={submitting || loading}
              className="w-full min-h-[48px]"
            >
              <Save className="h-4 w-4" />
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
