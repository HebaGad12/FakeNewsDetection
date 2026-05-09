

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Send, Image as ImageIcon, Bold, Italic, Link as LinkIcon, List, ListOrdered, Quote, Heading2, X, AlertCircle, TrendingUp, Sparkles, Mic, Heart, Globe, Flame, Video, Brain } from "lucide-react";
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

  if (!isAuthenticated || !user || user.role !== "journalist") {
    return <Navigate to="/login" replace />;
  }

  const handleMediaSelected = (media: UploadedMedia[]) => setUploadedMedia(media);
  const handleRemoveMedia = (mediaId: string) => setUploadedMedia((prev) => prev.filter((m) => m.id !== mediaId));
  const handleToggleCopyright = (mediaId: string, isCopyrighted: boolean) => setUploadedMedia((prev) => prev.map((m) => (m.id === mediaId ? { ...m, isCopyrighted } : m)));

  const handleSaveDraft = () => toast.success("Draft saved successfully!");

  const handlePublish = async () => {
    if (!formData.title || !formData.content || !formData.category) {
      toast.error("Please fill in required fields: title, content, and category");
      return;
    }
    setIsPublishing(true);
    try {
      const result = await journalistService.createPost({
        title: formData.title,
        content: formData.content,
        tags: [formData.category],
        images: uploadedMedia.map((item) => item.file),
        isCopyrightedFlags: uploadedMedia.map((item) => (item.mediaType === "image" ? item.isCopyrighted : false)),
      });
      if (result.moderationStatus === "Approved") toast.success("Article published successfully!");
      else if (result.moderationStatus === "Pending") toast.success("Article submitted for approval!");
      else toast.success("Article created successfully!");
      navigate("/dashboard");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to publish article");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-500" />
            </Link>
            <h1 className="font-serif text-2xl md:text-3xl font-bold text-slate-900">Create New Article</h1>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSaveDraft} disabled={isPublishing} className="rounded-full border-slate-300">
              <Save className="h-4 w-4 mr-2" /> Save Draft
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing} className="bg-slate-900 hover:bg-slate-800 rounded-full">
              {isPublishing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              {user.role === "journalist" && user.organization ? "Submit for Review" : "Publish"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <Label htmlFor="title" className="text-slate-700">Article Title *</Label>
              <Input id="title" placeholder="Enter a compelling headline..." value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="mt-1 text-lg font-semibold h-14 rounded-lg border-slate-200 focus:border-red-600 focus:ring-0" />
            </div>
            <div>
              <Label htmlFor="excerpt" className="text-slate-700">Excerpt / Summary</Label>
              <Textarea id="excerpt" placeholder="Write a brief summary..." value={formData.excerpt} onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })} className="mt-1 rounded-lg border-slate-200 focus:border-red-600 focus:ring-0" rows={3} />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center gap-1 flex-wrap">
              {[Bold, Italic, Heading2, LinkIcon, List, ListOrdered, Quote, ImageIcon].map((Icon, i) => (
                <Button key={i} variant="ghost" size="icon" className="h-8 w-8 text-slate-500"><Icon className="h-4 w-4" /></Button>
              ))}
            </div>
            <div>
              <Label htmlFor="content" className="text-slate-700">Article Content *</Label>
              <Textarea id="content" placeholder="Write your article content here..." value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="mt-1 min-h-[400px] font-mono rounded-lg border-slate-200 focus:border-red-600 focus:ring-0" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
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

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <MediaUpload onMediaSelected={handleMediaSelected} uploadedMedia={uploadedMedia} />
            </div>

            {uploadedMedia.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <MediaList media={uploadedMedia} onRemove={handleRemoveMedia} onToggleCopyright={handleToggleCopyright} />
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 mb-2">AI Credibility Check</h3>
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