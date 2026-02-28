import { motion } from "framer-motion";
import { Clock, Eye, MessageCircle, Share2, Bookmark, User } from "lucide-react";
import { CredibilityBadge, CredibilityLevel } from "@/components/CredibilityBadge";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface NewsCardProps {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  authorAvatar?: string;
  organization?: string;
  image: string;
  category: string;
  credibility: CredibilityLevel;
  credibilityScore?: number;
  readTime: string;
  views: number;
  comments: number;
  publishedAt: string;
  featured?: boolean;
  className?: string;
}

export function NewsCard({
  id,
  title,
  excerpt,
  author,
  authorAvatar,
  organization,
  image,
  category,
  credibility,
  credibilityScore,
  readTime,
  views,
  comments,
  publishedAt,
  featured = false,
  className,
}: NewsCardProps) {
  return (
    <Link to={`/article/${id}`}>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "group relative bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer",
          featured && "md:col-span-2 md:row-span-2",
          className
        )}
      >
      {/* Image */}
      <div className={cn("relative overflow-hidden", featured ? "h-64 md:h-80" : "h-48")}>
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Category Badge */}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-accent/90 text-accent-foreground backdrop-blur-sm">
            {category}
          </span>
        </div>

        {/* Credibility Badge */}
        <div className="absolute top-4 right-4">
          <CredibilityBadge level={credibility} score={credibilityScore} size="sm" />
        </div>

        {/* Save Button */}
        <button className="absolute bottom-4 right-4 p-2 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-background">
          <Bookmark className="h-4 w-4 text-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className={cn(
          "font-display font-semibold text-card-foreground leading-tight mb-2 group-hover:text-accent transition-colors line-clamp-2",
          featured ? "text-xl md:text-2xl" : "text-lg"
        )}>
          {title}
        </h3>
        
        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-4">
          {excerpt}
        </p>

        {/* Author */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {authorAvatar ? (
              <img src={authorAvatar} alt={author} className="w-full h-full object-cover" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{author}</p>
            {organization && (
              <p className="text-xs text-muted-foreground truncate">{organization}</p>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {readTime}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {views.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {comments}
            </span>
          </div>
          <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      </motion.article>
    </Link>
  );
}
