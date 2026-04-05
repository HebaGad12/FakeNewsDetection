import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Send,
  Image as ImageIcon,
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Heading2,
  X,
  AlertCircle,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { journalistService } from "@/services/journalistService";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { MediaUpload, UploadedMedia } from "@/components/MediaUpload";
import { MediaList } from "@/components/MediaList";

const categories = [
  "Politics",
  "Technology",
  "Science",
  "Health",
  "Environment",
  "Economy",
  "Sports",
  "Entertainment",
];

const CreateArticlePage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Admins cannot create articles
  if (user?.role === "admin") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/feed")}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Feed
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center"
          >
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
            <h2 className="mb-2 text-xl font-semibold text-foreground">
              Access Denied
            </h2>
            <p className="mb-6 text-muted-foreground">
              Admins cannot create articles. Please use the admin dashboard for moderation tasks.
            </p>
            <Button onClick={() => navigate("/feed")}>Return to Feed</Button>
          </motion.div>
        </main>
      </div>
    );
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "",
    featuredImage: "",
  });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isPublishing, setIsPublishing] = useState(false);

  if (!isAuthenticated || !user || user.role !== "journalist") {
    return <Navigate to="/login" replace />;
  }

  const handleMediaSelected = (media: UploadedMedia[]) => {
    setUploadedMedia(media);
  };

  const handleRemoveMedia = (mediaId: string) => {
    setUploadedMedia((prev) => prev.filter((m) => m.id !== mediaId));
    toast.success("Media removed");
  };

  const handleToggleCopyright = (mediaId: string, isCopyrighted: boolean) => {
    setUploadedMedia((prev) =>
      prev.map((m) =>
        m.id === mediaId ? { ...m, isCopyrighted } : m
      )
    );
  };

  const handleSaveDraft = () => {
    toast.success("Draft saved successfully!");
  };

  const handlePublish = async () => {
    if (!formData.title || !formData.content || !formData.category) {
      const missingFields = [];
      if (!formData.title) missingFields.push("title");
      if (!formData.content) missingFields.push("content");
      if (!formData.category) missingFields.push("category");
      toast.error(`Please fill in required fields: ${missingFields.join(", ")}`);
      return;
    }
    
    setIsPublishing(true);
    try {
      // Create post with multipart/form-data payload
      const result = await journalistService.createPost({
        title: formData.title,
        content: formData.content,
        tags: [formData.category],
        images: uploadedMedia.map((item) => item.file),
        isCopyrightedFlags: uploadedMedia.map((item) =>
          item.mediaType === "image" ? item.isCopyrighted : false
        ),
      });

      if (result.moderationStatus === "Approved") {
        toast.success("Article published successfully!");
      } else if (result.moderationStatus === "Pending") {
        toast.success("Article submitted for approval!");
      } else {
        toast.success("Article created successfully!");
      }
      
      navigate("/dashboard");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Failed to publish article:", err);

      const responseData = err?.response?.data;
      const validationErrors = responseData?.errors
        ? Object.entries(responseData.errors)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(", ")}`)
            .join(" | ")
        : "";
      const analysis = responseData?.analysis ? ` ${responseData.analysis}` : "";
      const baseMessage =
        validationErrors ||
        responseData?.message ||
        responseData?.detail ||
        responseData?.error ||
        responseData?.title ||
        err?.message ||
        "Failed to publish article. Please try again.";

      toast.error(`${baseMessage}${analysis}`.trim());
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-primary">
              Create New Article
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveDraft} disabled={isPublishing}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing}>
              {isPublishing ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {user.role === "journalist" && user.organization ? "Submit for Review" : "Publish"}
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Editor */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Article Title *</Label>
              <Input
                id="title"
                placeholder="Enter a compelling headline..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="text-xl font-semibold h-14"
              />
            </div>

            {/* Excerpt */}
            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt / Summary</Label>
              <Textarea
                id="excerpt"
                placeholder="Write a brief summary of your article..."
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                className="min-h-[80px]"
              />
            </div>

            {/* Editor Toolbar */}
            <div className="bg-card border border-border rounded-lg p-2 flex items-center gap-1 flex-wrap">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Bold className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Italic className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Heading2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <LinkIcon className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <List className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ListOrdered className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Quote className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Article Content *</Label>
              <Textarea
                id="content"
                placeholder="Write your article content here..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="min-h-[400px] font-mono"
              />
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Category */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <Label>Category *</Label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={formData.category === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({ ...formData, category: cat })}
                    className="text-sm"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            {/* Media Upload */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <MediaUpload
                onMediaSelected={handleMediaSelected}
                uploadedMedia={uploadedMedia}
              />
            </div>

            {/* Media List */}
            {uploadedMedia.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <MediaList
                  media={uploadedMedia}
                  onRemove={handleRemoveMedia}
                  onToggleCopyright={handleToggleCopyright}
                />
              </div>
            )}

            {/* AI Credibility Preview */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-3">AI Credibility Check</h3>
              <p className="text-sm text-muted-foreground">
                Your article will be analyzed by our AI system for credibility scoring after submission.
              </p>
            </div>
          </motion.div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateArticlePage;
