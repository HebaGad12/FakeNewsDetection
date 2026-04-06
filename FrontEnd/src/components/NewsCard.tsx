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
  authorId?: string;
  authorAvatar?: string;
  organization?: string;
  image?: string[];
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
  authorId,
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
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all duration-300",
        featured && "md:col-span-2 md:row-span-2",
        className
      )}
    >
      {/* Top Header: Author Info */}
      <div className="flex items-start justify-between p-4 pb-2 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Link 
            to={authorId ? `/profiles/${authorId}` : `#`} 
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity flex-shrink-0"
          >
            {authorAvatar ? (
              <img src={authorAvatar} alt={author} className="w-full h-full object-cover" />
            ) : (
              <User className="h-5 w-5 text-muted-foreground" />
            )}
          </Link>
          <div className="flex flex-col min-w-0">
            <Link 
              to={authorId ? `/profiles/${authorId}` : `#`} 
              className="text-sm font-semibold text-foreground truncate hover:underline"
            >
              {author}
            </Link>
            <div className="flex items-center text-xs text-muted-foreground gap-2">
              {organization && <span className="truncate">{organization}</span>}
              {organization && <span>•</span>}
              <span>{publishedAt}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CredibilityBadge level={credibility} score={credibilityScore} size="sm" />
        </div>
      </div>

      {/* Main Content (Links to detail) */}
      <Link to={`/article/${id}`} className="block relative cursor-pointer">
        <div className="p-4 pt-2">
          {/* Category Badge - small */}
          <div className="mb-2">
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-accent/10 text-accent uppercase tracking-wider">
              {category}
            </span>
          </div>

          <h3 className={cn(
            "font-display font-semibold text-card-foreground leading-tight mb-2 group-hover:text-primary transition-colors",
            featured ? "text-xl" : "text-lg"
          )}>
            {title}
          </h3>
          
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 mb-3">
            {excerpt}
          </p>
        </div>

        {/* Media Section */}
        {image && image.length > 0 && (
          <div className="relative w-full border-y border-border/50 bg-muted/20">
            {image.length === 1 ? (
              <div className="relative aspect-video w-full overflow-hidden">
                <img
                  src={image[0]}
                  alt={title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1 aspect-video w-full overflow-hidden">
                {image.slice(0, 4).map((img, idx) => (
                  <div key={idx} className="relative w-full h-full">
                    <img
                      src={img}
                      alt={`${title} - image ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {idx === 3 && image.length > 4 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white font-medium text-lg">+{image.length - 4}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Link>

      {/* Meta bottom footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground p-3 bg-card px-4 border-t border-border/50">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 hover:text-foreground transition-colors cursor-default">
            <Clock className="h-3.5 w-3.5" />
            {readTime}
          </span>
          <span className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer">
            <Eye className="h-3.5 w-3.5" />
            {views.toLocaleString()}
          </span>
          <span className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer">
            <MessageCircle className="h-3.5 w-3.5" />
            {comments}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" aria-label="Bookmark">
            <Bookmark className="h-4 w-4" />
          </button>
          <button className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" aria-label="Share">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
