import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield,
  TrendingUp,
  Clock,
  Eye,
  Flame,
  Newspaper,
  Video,
  Mic,
  Globe,
  Heart,
  MessageSquare,
  ArrowRight,
  Play,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { postsService, Post } from "@/services/postsService";
import { CredibilityBadge } from "@/components/CredibilityBadge";


const SECTIONS = [
  { id: "latest", name: "Latest News", icon: Clock },
  { id: "trending", name: "Most Read", icon: Flame },
  { id: "politics", name: "Politics", icon: Globe },
  { id: "technology", name: "Technology", icon: TrendingUp },
  { id: "health", name: "Health", icon: Heart },
];


 


const Index = () => {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("latest");

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setIsLoading(true);
        const posts = await postsService.getAllPosts();
        setAllPosts(posts);
      } catch (error) {
        console.error("Failed to load posts:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPosts();
  }, []);

  // ترتيب البوستات حسب التاريخ (الأحدث أولاً)
  const latestPosts = [...allPosts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // ترتيب البوستات حسب التفاعل (الأكثر قراءة)
  const trendingPosts = [...allPosts].sort(
    (a, b) => (b.likesCount || 0) - (a.likesCount || 0)
  );

  // فلترة البوستات حسب القسم
  const politicsPosts = allPosts.filter((p) =>
    p.tags?.some((t) => t.toLowerCase() === "politics")
  );
  const techPosts = allPosts.filter((p) =>
    p.tags?.some((t) => t.toLowerCase() === "technology")
  );
  const healthPosts = allPosts.filter((p) =>
    p.tags?.some((t) => t.toLowerCase() === "health")
  );

  const getPostsForSection = () => {
    switch (activeSection) {
      case "latest":
        return latestPosts;
      case "trending":
        return trendingPosts;
      case "politics":
        return politicsPosts;
      case "technology":
        return techPosts;
      case "health":
        return healthPosts;
      default:
        return latestPosts;
    }
  };

  const currentPosts = getPostsForSection();
  const featuredPost = latestPosts[0];
  const secondaryPosts = latestPosts.slice(1, 5);
  const restPosts = latestPosts.slice(5, 13);

  // تحويل Post إلى Props لعرض البطاقة
  const getPostProps = (post: Post) => {
    const credibility =
      post.verificationStatus?.toLowerCase() === "fake"
        ? "fake"
        : post.verificationStatus?.toLowerCase() === "questionable"
        ? "questionable"
        : "verified";

    return {
      id: post.id,
      title: post.title,
      excerpt: post.content.substring(0, 120) + "...",
      author: post.authorName,
      authorId: post.authorId,
      category: post.tags?.[0] || "News",
      credibility: credibility as "verified" | "questionable" | "fake",
      image:
        post.media && post.media.length > 0
          ? postsService.getImageUrl(post.media[0].path)
          : undefined,
      publishedAt: new Date(post.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      readTime: `${Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200))} min read`,
      views: post.likesCount || 0,
      comments: post.comments?.length || 0,
    };
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main>
        {/* ========== TOP BAR ========== */}
        <div className="bg-slate-50 border-b border-slate-200 py-3">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span className="text-slate-600">
                  <span className="font-semibold text-slate-900">AI-Powered</span> Truth Detection
                </span>
              </div>
              <Link to="/feed" className="text-sm text-red-600 hover:underline font-medium">
                View All News →
              </Link>
            </div>
          </div>
        </div>

        {/* ========== HERO GRID - تصميم شبكة الأخبار الرئيسية ========== */}
        <div className="container mx-auto px-4 py-6">
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-slate-200 rounded-xl h-48 mb-3" />
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Featured Story - البوست المميز الكبير */}
              {featuredPost && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <Link
                    to={`/article/${featuredPost.id}`}
                    className="lg:col-span-2 group relative overflow-hidden rounded-xl bg-slate-900"
                  >
                    {featuredPost.media && featuredPost.media[0] && (
                      <img
                        src={postsService.getImageUrl(featuredPost.media[0].path)}
                        alt={featuredPost.title}
                        className="w-full h-[400px] object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 uppercase">
                          {featuredPost.tags?.[0] || "Top Story"}
                        </span>
                        <span className="text-white/60 text-sm">
                          {new Date(featuredPost.createdAt).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 leading-tight">
                        {featuredPost.title}
                      </h1>
                      <p className="text-white/70 text-sm line-clamp-2">
                        {featuredPost.content.substring(0, 150)}...
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-white/50 text-xs">
                        <span>{featuredPost.authorName}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {getPostProps(featuredPost).readTime}
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Side Stories - البوستات الجانبية */}
                  <div className="space-y-4">
                    {secondaryPosts.map((post, idx) => (
                      <Link
                        key={post.id}
                        to={`/article/${post.id}`}
                        className="group flex gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100">
                          {post.media && post.media[0] && (
                            <img
                              src={postsService.getImageUrl(post.media[0].path)}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-red-600 uppercase">
                            {post.tags?.[0] || "News"}
                          </span>
                          <h3 className="font-semibold text-slate-900 group-hover:text-red-600 transition-colors line-clamp-2 text-sm mt-0.5">
                            {post.title}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* ========== SECTION TABS ========== */}
              <div className="border-b border-slate-200 mb-6">
                <div className="flex gap-1 overflow-x-auto">
                  {SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap",
                        activeSection === section.id
                          ? "border-red-600 text-slate-900"
                          : "border-transparent text-slate-500 hover:text-slate-700"
                      )}
                    >
                      <section.icon className="h-4 w-4" />
                      {section.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* ========== SECTION CONTENT - شبكة 3 أعمدة ========== */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {currentPosts.slice(0, 6).map((post) => (
                  <Link
                    key={post.id}
                    to={`/article/${post.id}`}
                    className="group block"
                  >
                    <div className="rounded-xl overflow-hidden bg-slate-100 mb-3 aspect-video">
                      {post.media && post.media[0] && (
                        <img
                          src={postsService.getImageUrl(post.media[0].path)}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs mb-2">
                      <span className="font-semibold text-red-600 uppercase">
                        {post.tags?.[0] || "News"}
                      </span>
                      <span className="text-slate-400">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-lg text-slate-900 group-hover:text-red-600 transition-colors line-clamp-2 mb-1">
                      {post.title}
                    </h3>
                    <p className="text-slate-500 text-sm line-clamp-2 mb-2">
                      {post.content.substring(0, 100)}...
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>{post.authorName}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {post.likesCount || 0}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* ========== LOAD MORE BUTTON ========== */}
              <div className="text-center py-8">
                <Link to="/feed">
                  <Button
                    variant="outline"
                    className="rounded-full px-8 border-slate-300 text-slate-700 hover:border-red-600 hover:text-red-600"
                  >
                    Load More Articles
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>

        {/* ========== FEATURES SECTION - مبسط ========== */}
        <section className="bg-slate-50 border-y border-slate-200 py-12">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-slate-900">
                Why Trust TruthTrack?
              </h2>
              <p className="text-slate-500 mt-2">
                AI-powered verification for reliable news
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { icon: Shield, title: "AI Detection", desc: "Real-time fake news detection" },
                { icon: TrendingUp, title: "Credibility Score", desc: "Transparent trust indicators" },
                { icon: MessageSquare, title: "Community Moderation", desc: "Users help flag content" },
                { icon: Globe, title: "Global Coverage", desc: "News from verified sources" },
              ].map((item, i) => (
                <div key={i} className="text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                    <item.icon className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== CTA Section ========== */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-center">
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-white mb-3">
                Join the Fight Against Misinformation
              </h2>
              <p className="text-slate-300 mb-6 max-w-xl mx-auto">
                Create your free account and become part of a community dedicated to truthful journalism.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register">
                  <Button className="bg-red-600 hover:bg-red-700 text-white rounded-full px-8">
                    Get Started Free
                  </Button>
                </Link>
                <Link to="/about">
                  <Button
                    variant="outline"
                    className="border-slate-600 text-white hover:bg-slate-800 rounded-full px-8"
                  >
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;