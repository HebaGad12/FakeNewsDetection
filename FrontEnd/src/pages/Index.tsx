import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  Shield, 
  ShieldCheck, 
  Users, 
  Radio, 
  Brain, 
  Heart,
  ArrowRight,
  CheckCircle,
  MessageSquare,
  Award,
  Loader2
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FeatureCard } from "@/components/FeatureCard";
import { StatCard } from "@/components/StatCard";
import { NewsCard } from "@/components/NewsCard";
import { CredibilityBadge } from "@/components/CredibilityBadge";
import { Button } from "@/components/ui/button";
import { postsService, Post, POST_DELETED_EVENT } from "@/services/postsService";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Detection",
    description: "Advanced machine learning algorithms analyze content in real-time to identify fake news and misinformation.",
  },
  {
    icon: ShieldCheck,
    title: "Credibility Badges",
    description: "Clear visual indicators show content trustworthiness—Verified, Questionable, or Fake—at a glance.",
  },
  {
    icon: MessageSquare,
    title: "Hate Speech Moderation",
    description: "Automatic detection and filtering of harmful content across posts, comments, and live streams.",
  },
  {
    icon: Users,
    title: "Community Discussions",
    description: "Join topic-based communities for informed discussions with like-minded citizens and experts.",
  },
  {
    icon: Radio,
    title: "Live Streaming",
    description: "Journalists host interactive sessions with real-time Q&A, polls, and audience engagement.",
  },
  {
    icon: Heart,
    title: "Support Journalism",
    description: "Donate directly to credible journalists and organizations you trust via secure payments.",
  },
];

const stats = [
  { value: "99.2%", label: "Detection Accuracy" },
  { value: "50K+", label: "Verified Articles" },
  { value: "10K+", label: "Active Journalists" },
  { value: "2M+", label: "Informed Readers" },
];

const roles = [
  {
    title: "Readers",
    description: "Browse verified news, join communities, and support credible journalism",
    icon: Users,
  },
  {
    title: "Journalists",
    description: "Create content, host live streams, and grow your audience",
    icon: Radio,
  },
  {
    title: "Organizations",
    description: "Manage teams, approve content, and track performance",
    icon: Award,
  },
];

const Index = () => {
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrendingPosts = async () => {
      try {
        setIsLoading(true);
        const posts = await postsService.getAllPosts();
        
        // Simple trending fallback: sort by likes + comments (if available), then by recent date
        const sortedPosts = posts.sort((a, b) => {
          const engagementA = (a.likesCount || 0) + (a.comments?.length || 0);
          const engagementB = (b.likesCount || 0) + (b.comments?.length || 0);
          if (engagementA !== engagementB) {
            return engagementB - engagementA;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        // Take top 3 trending posts for the home page
        setTrendingPosts(sortedPosts.slice(0, 3));
      } catch (error) {
        console.error("Failed to fetch trending posts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrendingPosts();

    const handlePostDeleted = (event: CustomEvent<{ postId: string }>) => {
      const deletedPostId = event.detail?.postId;
      if (deletedPostId) {
        setTrendingPosts((prev) => prev.filter((post) => post.id !== deletedPostId));
      }
    };

    window.addEventListener(POST_DELETED_EVENT, handlePostDeleted as EventListener);
    return () => window.removeEventListener(POST_DELETED_EVENT, handlePostDeleted as EventListener);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-background to-primary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />

        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8"
            >
              <Shield className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">AI-Powered News Verification</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-primary mb-6 leading-tight"
            >
              Truth in Every Story
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed"
            >
              TruthTrack uses advanced AI to detect fake news and combat misinformation. 
              Stay informed with verified content from credible journalists worldwide.
            </motion.p>

            {/* Credibility Badges Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-wrap justify-center gap-3 mb-10"
            >
              <CredibilityBadge level="verified" />
              <CredibilityBadge level="questionable" />
              <CredibilityBadge level="fake" />
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link to="/feed">
                <Button size="lg" className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 gap-2 px-8">
                  Explore News Feed
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Floating Elements */}
        <motion.div
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-10 hidden lg:block"
        >
          <div className="p-4 rounded-2xl bg-card/80 backdrop-blur-sm border border-border shadow-lg">
            <CheckCircle className="h-8 w-8 text-verified" />
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute bottom-1/4 right-10 hidden lg:block"
        >
          <div className="p-4 rounded-2xl bg-card/80 backdrop-blur-sm border border-border shadow-lg">
            <Brain className="h-8 w-8 text-accent" />
          </div>
        </motion.div>
      </section>

      {/* Stats Section
      <section className="py-16 border-y border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <StatCard key={stat.label} {...stat} index={index} />
            ))}
          </div>
        </div>
      </section> */}

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary mb-4">
              Fighting Misinformation Together
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our platform combines cutting-edge AI technology with community-driven moderation 
              to ensure you always have access to trustworthy news.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} {...feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Trending News Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary mb-2">
                Trending Stories
              </h2>
              <p className="text-muted-foreground">
                Latest verified news from trusted sources
              </p>
            </div>
            <Link to="/feed">
              <Button variant="outline" className="hidden md:flex gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-accent" />
              <p>Loading trending stories...</p>
            </div>
          ) : trendingPosts && trendingPosts.length > 0 ? (
            <div className="flex overflow-x-auto gap-6 pb-8 pt-4 px-2 -mx-2 scrollbar-hide snap-x">
              {trendingPosts.map((post) => {
                const newsCardProps = postsService.postToNewsCardProps(post);
                return (
                  <motion.div 
                    key={post.id}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className="snap-start flex-shrink-0 w-72 md:w-80 flex flex-col gap-3 group cursor-pointer"
                  >
                    <Link to={`/article/${post.id}`}>
                      {/* Story Card Image wrapper */}
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-md mb-4 ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
                        <img 
                          src={newsCardProps.image?.[0] || "/placeholder.svg"} 
                          alt={newsCardProps.title} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <CredibilityBadge level={newsCardProps.credibility} size="sm" className="mb-2" />
                          <h3 className="text-white font-display font-bold leading-tight line-clamp-2">
                            {newsCardProps.title}
                          </h3>
                        </div>
                      </div>
                    </Link>
                    
                    {/* Minimal Meta */}
                    <div className="flex items-center gap-3 px-1">
                      <Link to={`/profiles/${post.authorId}`}>
                        <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0 ring-2 ring-border">
                          {newsCardProps.authorAvatar ? (
                            <img src={newsCardProps.authorAvatar} alt={newsCardProps.author} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-4 h-4 m-auto mt-2 text-muted-foreground" />
                          )}
                        </div>
                      </Link>
                      <div className="flex flex-col min-w-0">
                        <Link to={`/profiles/${post.authorId}`} className="text-sm font-medium text-foreground truncate hover:underline">
                          {newsCardProps.author}
                        </Link>
                        <p className="text-xs text-muted-foreground">{newsCardProps.publishedAt}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-lg text-foreground mb-1">No trending stories available</h3>
              <p className="text-muted-foreground">Check back later for the latest news.</p>
            </div>
          )}

          <div className="mt-8 text-center md:hidden">
            <Link to="/feed">
              <Button variant="outline" className="gap-2">
                View All Stories
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-primary mb-4">
              Built for Everyone
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you're a reader, journalist, or organization, TruthTrack has the tools you need.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {roles.map((role, index) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative p-8 rounded-2xl bg-card border border-border text-center hover:shadow-xl transition-all duration-300 group"
              >
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl gradient-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                  <role.icon className="h-8 w-8 text-accent-foreground" />
                </div>
                <h3 className="font-display text-xl font-semibold text-card-foreground mb-3">
                  {role.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {role.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl gradient-hero p-10 md:p-16 text-center"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
              <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
            </div>

            <div className="relative">
              <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-6">
                Join the Fight Against Misinformation
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
                Create your free account today and become part of a community dedicated to truth and credible journalism.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register">
                  <Button size="lg" className="w-full sm:w-auto bg-background text-primary hover:bg-background/90 px-8">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
