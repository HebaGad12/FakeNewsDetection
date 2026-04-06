import { motion } from "framer-motion";
import { Link } from "react-router-dom";
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
  Award
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FeatureCard } from "@/components/FeatureCard";
import { StatCard } from "@/components/StatCard";
import { CredibilityBadge } from "@/components/CredibilityBadge";
import { Button } from "@/components/ui/button";

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
