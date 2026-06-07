

import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Send, Image as ImageIcon, Bold, Italic, Link as LinkIcon, List, ListOrdered, Quote, Heading2, AlertCircle, TrendingUp, Sparkles, Heart, Globe, Flame, Video, Brain, Newspaper, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { journalistService } from "@/services/journalistService";
import { journalistTaskService } from "@/services/journalistTask";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { MediaUpload, UploadedMedia } from "@/components/MediaUpload";
import { MediaList } from "@/components/MediaList";
import { cn } from "@/lib/utils";

const categories = [
  { name: "Politics", icon: TrendingUp },
  { name: "Technology", icon: Sparkles },
  { name: "Science", icon: Brain },
  { name: "Health", icon: Heart },
  { name: "Environment", icon: Globe },
  { name: "Economy", icon: TrendingUp },
  { name: "Sports", icon: Flame },
  { name: "Entertainment", icon: Video }
];

const CreateArticlePage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get("taskId");
  const draftId = searchParams.get("draftId");

  // Admins cannot create articles
  if (user?.role === "admin") {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-rose-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-500 mb-6">Admins cannot create articles. Please use the admin dashboard.</p>
            <Button onClick={() => navigate("/feed")} className="bg-slate-900 hover:bg-slate-800">Return to Feed</Button>
          </div>
        </main>
      </div>
    );
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [formData, setFormData] = useState({ title: "", excerpt: "", content: "", category: "", featuredImage: "" });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isPublishing, setIsPublishing] = useState(false);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [taskLoading, setTaskLoading] = useState(!!taskId);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [activeDraftId, setActiveDraftId] = useState<string | null>(draftId);

  // Load task details if taskId is present
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (taskId) {
      const loadTask = async () => {
        try {
          const [task, drafts] = await Promise.all([
            journalistTaskService.getTask(taskId),
            draftId ? journalistTaskService.getTaskDrafts(taskId).catch(() => []) : Promise.resolve([]),
          ]);

          if (draftId) {
            const selectedDraft = drafts.find((draft) => draft.id === draftId) ?? drafts[0] ?? null;
            if (!selectedDraft) {
              toast.error("Draft not found for this task");
            } else {
              setActiveDraftId(selectedDraft.id);
              setFormData({
                title: selectedDraft.title || task.title,
                excerpt: task.description,
                content: selectedDraft.content,
                category: selectedDraft.tags[0] || "",
                featuredImage: "",
              });
            }
          } else {
            setFormData(prev => ({
              ...prev,
              title: task.title,
              excerpt: task.description
            }));
          }
        } catch (err) {
          console.error("Failed to load task details", err);
          toast.error("Failed to load task details");
        } finally {
          setTaskLoading(false);
        }
      };
      loadTask();
    }
  }, [taskId, draftId]);

  if (!isAuthenticated || !user || user.role !== "journalist") {
    return <Navigate to="/login" replace />;
  }

  if (taskLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </main>
      </div>
    );
  }

  const handleMediaSelected = (media: UploadedMedia[]) => setUploadedMedia(media);
  const handleRemoveMedia = (mediaId: string) => setUploadedMedia((prev) => prev.filter((m) => m.id !== mediaId));
  const handleToggleCopyright = (mediaId: string, isCopyrighted: boolean) => setUploadedMedia((prev) => prev.map((m) => (m.id === mediaId ? { ...m, isCopyrighted } : m)));

  const syncTaskStatus = async (status: number) => {
    if (!taskId) return;

    try {
      await journalistTaskService.updateTaskStatus(taskId, status);
      window.dispatchEvent(new CustomEvent("task:status-updated", { detail: { taskId, status } }));
    } catch (error: any) {
      console.error("Failed to update task status", error);
      toast.error(error?.response?.data?.message || "Failed to update task status");
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Please enter a title and content first");
      return;
    }

    const tags = formData.category ? [formData.category] : [];

    if (!taskId) {
      toast.success("Draft saved successfully!");
      return;
    }

    setIsPublishing(true);
    try {
      if (activeDraftId) {
        await journalistTaskService.updateTaskDraft(taskId, activeDraftId, {
          title: formData.title,
          content: formData.content,
          tags: formData.category,
          publishNow: false,
        });
        toast.success("Draft updated successfully!");
        await syncTaskStatus(2);
      } else {
        const result = await journalistService.createPost({
          title: formData.title,
          content: formData.content,
          tags,
          images: uploadedMedia.map((item) => item.file),
          isCopyrightedFlags: uploadedMedia.map((item) => (item.mediaType === "image" ? item.isCopyrighted : false)),
          isDraft: true,
          taskId,
        });
        setActiveDraftId(result.postId);
        navigate(`?taskId=${taskId}&draftId=${result.postId}`, { replace: true });
        toast.success("Draft saved successfully!");
        await syncTaskStatus(2);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save draft");
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublish = async () => {
    if (!formData.title || !formData.content || (!formData.category && !taskId)) {
      toast.error("Please fill in required fields: title, content, and category");
      return;
    }
    setIsPublishing(true);
    try {
      if (taskId && activeDraftId) {
        await journalistTaskService.updateTaskDraft(taskId, activeDraftId, {
          title: formData.title,
          content: formData.content,
          tags: formData.category,
          publishNow: true,
        });
        await syncTaskStatus(3);
        toast.success("Draft published successfully!");
        navigate("/dashboard");
      } else {
        const result = await journalistService.createPost({
          title: formData.title,
          content: formData.content,
          tags: formData.category ? [formData.category] : [],
          images: uploadedMedia.map((item) => item.file),
          isCopyrightedFlags: uploadedMedia.map((item) => (item.mediaType === "image" ? item.isCopyrighted : false)),
          isDraft: false,
          taskId: taskId || undefined,
        });
        if (result.moderationStatus === "Approved") toast.success("Article published successfully!");
        else if (result.moderationStatus === "Pending") toast.success("Article submitted for approval!");
        else toast.success("Article created successfully!");
        await syncTaskStatus(3);
        navigate("/dashboard");
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to publish article");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="editorial-shell">
      <Header />

      <main className="news-container py-8">
        <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="cursor-pointer rounded-md border border-slate-200 p-2 transition-colors hover:bg-slate-100">
              <ArrowLeft className="h-5 w-5 text-slate-500" />
            </Link>
            <div>
              <div className="news-kicker mb-3">
                <Newspaper className="h-4 w-4" />
                Assignment Desk
              </div>
              <h1 className="font-serif text-3xl font-bold leading-tight text-slate-950 md:text-5xl">Create New Article</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Compose a source-backed story with media, category metadata, and newsroom review controls.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSaveDraft} disabled={isPublishing} className="rounded-md border-slate-300">
              <Save className="h-4 w-4 mr-2" /> Save Draft
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing} className="rounded-md bg-red-600 hover:bg-red-700">
              {isPublishing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              {taskId && activeDraftId ? "Publish Draft" : user.role === "journalist" && user.organization ? "Submit for Review" : "Publish"}
            </Button>
          </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="editorial-card p-5">
              <Label htmlFor="title" className="text-slate-700">Article Title *</Label>
              <Input id="title" placeholder="Enter a compelling headline..." value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="mt-1 text-lg font-semibold h-14 rounded-lg border-slate-200 focus:border-red-600 focus:ring-0" />
            </div>
            <div className="editorial-card p-5">
              <Label htmlFor="excerpt" className="text-slate-700">Excerpt / Summary</Label>
              <Textarea id="excerpt" placeholder="Write a brief summary..." value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} className="mt-1 rounded-lg border-slate-200 focus:border-red-600 focus:ring-0" rows={3} />
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-2 flex items-center gap-1 flex-wrap shadow-sm">
              {[Bold, Italic, Heading2, LinkIcon, List, ListOrdered, Quote, ImageIcon].map((Icon, i) => (
                <Button key={i} variant="ghost" size="icon" className="h-8 w-8 text-slate-500"><Icon className="h-4 w-4" /></Button>
              ))}
            </div>
            <div className="editorial-card p-5">
              <Label htmlFor="content" className="text-slate-700">Article Content *</Label>
              <Textarea id="content" placeholder="Write your article content here..." value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="mt-1 min-h-[460px] rounded-lg border-slate-200 font-serif text-base leading-7 focus:border-red-600 focus:ring-0" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="editorial-card editorial-card-hover p-5">
              <Label className="text-slate-700 mb-3 block">Category *</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <Button 
                    key={cat.name} 
                    variant={formData.category === cat.name ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setFormData({ ...formData, category: cat.name })} 
                    className={cn(
                      "text-sm rounded-full gap-1.5 transition-all", 
                      formData.category === cat.name 
                        ? "bg-slate-900 hover:bg-slate-800 text-white border-slate-900" 
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <cat.icon className="w-3.5 h-3.5" />
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="editorial-card p-5">
              <MediaUpload onMediaSelected={handleMediaSelected} uploadedMedia={uploadedMedia} />
            </div>

            {uploadedMedia.length > 0 && (
              <div className="editorial-card p-5">
                <MediaList media={uploadedMedia} onRemove={handleRemoveMedia} onToggleCopyright={handleToggleCopyright} />
              </div>
            )}

            <div className="editorial-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-slate-900">AI Credibility Check</h3>
              </div>
              <p className="text-sm text-slate-500">Your article will be analyzed by our AI system for credibility scoring after submission.</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateArticlePage;
