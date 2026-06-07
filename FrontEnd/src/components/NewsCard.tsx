import { motion } from "framer-motion";
import { Clock, Eye, MessageCircle, Share2, Bookmark, User, ArrowUpRight } from "lucide-react";
import { CredibilityLevel } from "@/components/CredibilityBadge";
import { CategoryPill } from "@/components/news/NewsPrimitives";
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
  void credibility;
  void credibilityScore;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-xl",
        featured && "md:col-span-2 md:row-span-2",
        className
      )}
    >
      <div className="flex items-start justify-between border-b border-slate-200 p-4 pb-3">
        <div className="flex items-center gap-3">
          <Link 
            to={authorId ? `/profiles/${authorId}` : `#`} 
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100 transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-red-600"
          >
            {authorAvatar ? (
              <img src={authorAvatar} alt={author} className="w-full h-full object-cover" />
            ) : (
              <User className="h-5 w-5 text-slate-500" />
            )}
          </Link>
          <div className="flex flex-col min-w-0">
            <Link 
              to={authorId ? `/profiles/${authorId}` : `#`} 
              className="truncate text-sm font-semibold text-slate-950 hover:text-red-700"
            >
              {author}
            </Link>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {organization && <span className="truncate">{organization}</span>}
              {organization && <span>•</span>}
              <span>{publishedAt}</span>
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Brief <ArrowUpRight className="h-3 w-3" />
          </span>
        </div>
      </div>

      <Link to={`/article/${id}`} className="relative block cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-red-600">
        <div className="p-4 pt-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <CategoryPill category={category} />
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {readTime}
            </span>
          </div>

          <h3 className={cn(
            "mb-2 font-display font-semibold leading-tight text-slate-950 transition-colors group-hover:text-red-700",
            featured ? "text-2xl" : "text-xl"
          )}>
            {title}
          </h3>
          
          <p className="mb-3 line-clamp-3 text-sm leading-6 text-slate-600">
            {excerpt}
          </p>
        </div>

        {image && image.length > 0 && (
          <div className="relative w-full border-y border-slate-200 bg-slate-100">
            {image.length === 1 ? (
              <div className="relative aspect-video w-full overflow-hidden">
                <img
                  src={image[0]}
                  alt={title}
                  className="h-full w-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.02]"
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

      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 p-3 px-4 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="hidden cursor-default items-center gap-1 sm:flex">
            <Clock className="h-3.5 w-3.5" />
            {readTime}
          </span>
          <span className="flex cursor-default items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {views.toLocaleString()}
          </span>
          <span className="flex cursor-default items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {comments}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="cursor-pointer rounded-md p-2 text-slate-500 transition-colors hover:bg-white hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-red-600" aria-label="Bookmark">
            <Bookmark className="h-4 w-4" />
          </button>
          <button type="button" className="cursor-pointer rounded-md p-2 text-slate-500 transition-colors hover:bg-white hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-red-600" aria-label="Share">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
