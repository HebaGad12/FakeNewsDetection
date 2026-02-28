import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Radio, 
  Users, 
  MessageCircle, 
  ThumbsUp, 
  Share2,
  Clock,
  Play,
  Calendar
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CredibilityBadge } from "@/components/CredibilityBadge";
import { cn } from "@/lib/utils";

interface LiveStream {
  id: string;
  title: string;
  host: string;
  hostAvatar: string;
  organization?: string;
  thumbnail: string;
  viewers: number;
  category: string;
  isLive: boolean;
  scheduledFor?: string;
  duration?: string;
}

const liveStreams: LiveStream[] = [
  {
    id: "1",
    title: "Breaking: Climate Summit Day 2 - Live Coverage",
    host: "Sarah Mitchell",
    hostAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100",
    organization: "Climate Watch Network",
    thumbnail: "https://images.unsplash.com/photo-1569163139599-0f4517e36f51?w=800",
    viewers: 12450,
    category: "Environment",
    isLive: true,
  },
  {
    id: "2",
    title: "Tech Policy Deep Dive: New Privacy Regulations",
    host: "James Chen",
    hostAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    organization: "Tech Insider",
    thumbnail: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800",
    viewers: 8920,
    category: "Technology",
    isLive: true,
  },
  {
    id: "3",
    title: "Q&A Session: Understanding the New Economic Report",
    host: "Michael Rivera",
    hostAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
    thumbnail: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800",
    viewers: 5340,
    category: "Economy",
    isLive: true,
  },
];

const upcomingStreams: LiveStream[] = [
  {
    id: "4",
    title: "Weekly Health Update: Latest Medical Research",
    host: "Dr. Lisa Park",
    hostAvatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100",
    organization: "Health Research Institute",
    thumbnail: "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=800",
    viewers: 0,
    category: "Health",
    isLive: false,
    scheduledFor: "Tomorrow, 3:00 PM",
  },
  {
    id: "5",
    title: "Space Exploration: The Next Frontier",
    host: "Dr. Robert Chang",
    hostAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",
    organization: "Space Exploration Center",
    thumbnail: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800",
    viewers: 0,
    category: "Science",
    isLive: false,
    scheduledFor: "Friday, 5:00 PM",
  },
];

const pastStreams: LiveStream[] = [
  {
    id: "6",
    title: "Political Analysis: Mid-Term Elections Review",
    host: "Emma Thompson",
    hostAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100",
    thumbnail: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800",
    viewers: 45200,
    category: "Politics",
    isLive: false,
    duration: "1h 23m",
  },
  {
    id: "7",
    title: "Investigative Report: Corporate Accountability",
    host: "David Kim",
    hostAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100",
    thumbnail: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800",
    viewers: 28900,
    category: "Business",
    isLive: false,
    duration: "52m",
  },
];

const LivePage = () => {
  const [activeTab, setActiveTab] = useState<"live" | "upcoming" | "past">("live");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium text-destructive">LIVE</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-primary">
              Live Streams
            </h1>
          </div>
          <p className="text-muted-foreground">
            Watch verified journalists report news in real-time
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-border">
          {[
            { id: "live", label: "Live Now", count: liveStreams.length },
            { id: "upcoming", label: "Upcoming", count: upcomingStreams.length },
            { id: "past", label: "Past Streams", count: pastStreams.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-all",
                activeTab === tab.id
                  ? "border-accent text-accent"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              <span className="ml-2 px-2 py-0.5 rounded-full bg-muted text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Live Streams */}
        {activeTab === "live" && (
          <div className="space-y-8">
            {/* Featured Stream */}
            {liveStreams[0] && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-2xl overflow-hidden group cursor-pointer"
              >
                <div className="aspect-video md:aspect-[21/9]">
                  <img 
                    src={liveStreams[0].thumbnail} 
                    alt={liveStreams[0].title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                </div>
                
                {/* Live Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-destructive">
                  <span className="w-2 h-2 rounded-full bg-destructive-foreground animate-pulse" />
                  <span className="text-sm font-medium text-destructive-foreground">LIVE</span>
                </div>

                {/* Viewers */}
                <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm">
                  <Users className="h-4 w-4 text-white" />
                  <span className="text-sm font-medium text-white">
                    {liveStreams[0].viewers.toLocaleString()} watching
                  </span>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <span className="px-3 py-1 rounded-full bg-accent/90 text-accent-foreground text-xs font-medium mb-3 inline-block">
                    {liveStreams[0].category}
                  </span>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-3">
                    {liveStreams[0].title}
                  </h2>
                  <div className="flex items-center gap-3">
                    <img 
                      src={liveStreams[0].hostAvatar} 
                      alt={liveStreams[0].host}
                      className="w-10 h-10 rounded-full border-2 border-white"
                    />
                    <div>
                      <p className="text-white font-medium">{liveStreams[0].host}</p>
                      {liveStreams[0].organization && (
                        <p className="text-white/70 text-sm">{liveStreams[0].organization}</p>
                      )}
                    </div>
                    <CredibilityBadge level="verified" size="sm" className="ml-auto" />
                  </div>
                </div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-20 h-20 rounded-full bg-accent/90 flex items-center justify-center">
                    <Play className="h-10 w-10 text-accent-foreground ml-1" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Other Live Streams */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {liveStreams.slice(1).map((stream, index) => (
                <motion.div
                  key={stream.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group rounded-xl overflow-hidden border border-border bg-card hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="relative aspect-video">
                    <img 
                      src={stream.thumbnail} 
                      alt={stream.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 rounded-full bg-destructive">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive-foreground animate-pulse" />
                      <span className="text-xs font-medium text-destructive-foreground">LIVE</span>
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
                      <Users className="h-3 w-3 text-white" />
                      <span className="text-xs text-white">{stream.viewers.toLocaleString()}</span>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-14 h-14 rounded-full bg-accent/90 flex items-center justify-center">
                        <Play className="h-7 w-7 text-accent-foreground ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <span className="text-xs font-medium text-accent">{stream.category}</span>
                    <h3 className="font-semibold text-foreground mt-1 line-clamp-2">
                      {stream.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-3">
                      <img 
                        src={stream.hostAvatar} 
                        alt={stream.host}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{stream.host}</p>
                        {stream.organization && (
                          <p className="text-xs text-muted-foreground truncate">{stream.organization}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Streams */}
        {activeTab === "upcoming" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingStreams.map((stream, index) => (
              <motion.div
                key={stream.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="rounded-xl overflow-hidden border border-border bg-card"
              >
                <div className="relative aspect-video">
                  <img 
                    src={stream.thumbnail} 
                    alt={stream.title}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 rounded-full bg-accent">
                    <Calendar className="h-3 w-3 text-accent-foreground" />
                    <span className="text-xs font-medium text-accent-foreground">UPCOMING</span>
                  </div>
                </div>

                <div className="p-4">
                  <span className="text-xs font-medium text-accent">{stream.category}</span>
                  <h3 className="font-semibold text-foreground mt-1 line-clamp-2">
                    {stream.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-3">
                    <img 
                      src={stream.hostAvatar} 
                      alt={stream.host}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{stream.host}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {stream.scheduledFor}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      Remind Me
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Past Streams */}
        {activeTab === "past" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pastStreams.map((stream, index) => (
              <motion.div
                key={stream.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group rounded-xl overflow-hidden border border-border bg-card hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="relative aspect-video">
                  <img 
                    src={stream.thumbnail} 
                    alt={stream.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/70 text-white text-xs">
                    {stream.duration}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 rounded-full bg-accent/90 flex items-center justify-center">
                      <Play className="h-7 w-7 text-accent-foreground ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <span className="text-xs font-medium text-accent">{stream.category}</span>
                  <h3 className="font-semibold text-foreground mt-1 line-clamp-2">
                    {stream.title}
                  </h3>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <img 
                        src={stream.hostAvatar} 
                        alt={stream.host}
                        className="w-8 h-8 rounded-full"
                      />
                      <p className="text-sm font-medium text-foreground">{stream.host}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {stream.viewers.toLocaleString()} views
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default LivePage;
