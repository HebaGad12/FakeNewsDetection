import { useState, useEffect, useRef } from "react";
import { Camera, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { journalistService } from "@/services/journalistService";
import userService from "@/services/userService";
import organizationService from "@/services/organizationService";
import { toast } from "sonner";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
  const { user, refreshAvatar, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
  });
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load current profile data when dialog opens
  useEffect(() => {
    if (open && user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        bio: (user as any).bio || "",
      });
      setPictureFile(null);
      setPicturePreview(null);
      setAvatarLoadError(false);
    }
  }, [open, user]);

  const handlePictureSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setAvatarLoadError(false);

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      setPicturePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload immediately to the server
    if (user?.id) {
      try {
        if (user.role === "Organization" || user.role === "organization") {
          await organizationService.uploadProfilePicture(file);
        } else {
          await userService.uploadPicture(user.id, file);
        }
        // Create a blob URL from the file for instant display everywhere
        const localBlobUrl = URL.createObjectURL(file);
        await refreshAvatar(localBlobUrl);
        toast.success("Profile picture updated!");
      } catch {
        toast.error("Failed to upload profile picture.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {

      // Use appropriate service based on user role
      if (user?.role === "journalist") {
        await journalistService.editProfile(formData);
      } else if (user?.role === "Organization" || user?.role === "organization") {
        await organizationService.updateProfile({ name: formData.name, email: formData.email, bio: formData.bio });
      } else {
        await userService.editProfile(formData);
      }
      
      toast.success("Profile updated successfully!");
      
      // Update user in auth context
      if (user) {
        user.name = formData.name;
        user.email = formData.email;
        if (user.role === "Organization" || user.role === "organization") {
          (user as any).bio = formData.bio;
        }
      }
      
      onOpenChange(false);
      
      // Refresh user data in auth context (preserves avatar blob URL)
      await refreshUser();
    } catch (error: unknown) {
      console.error("Profile update error:", error);

      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message;
      if (message) {
        toast.error(message);
      } else {
        toast.error("Failed to update profile. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        bio: (user as any).bio || "",
      });
    }
    setPictureFile(null);
    setPicturePreview(null);
    onOpenChange(false);
  };

  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const currentAvatar = picturePreview || (!avatarLoadError ? user?.avatar : null);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information. Changes will be reflected across your account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative h-20 w-20 rounded-full overflow-hidden border-2 border-border hover:border-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt="Profile"
                    className="h-full w-full object-cover"
                    onError={() => setAvatarLoadError(true)}
                  />
                ) : (
                  <div className="h-full w-full bg-muted flex items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </button>
              <p className="text-xs text-muted-foreground">Click to change photo</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePictureSelect}
                className="hidden"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isLoading}
              />
            </div>
            {(user?.role === "Organization" || user?.role === "organization") && (
              <div className="space-y-2">
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about your organization..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  disabled={isLoading}
                  rows={3}
                  className="resize-none"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
