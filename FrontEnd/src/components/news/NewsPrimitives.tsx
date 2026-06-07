import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  Clock,
  Flame,
  Mail,
  Radio,
  Search,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface StoryPreview {
  id: string;
  title: string;
  category: string;
  author?: string;
  excerpt?: string;
  image?: string;
  publishedAt?: string;
  readTime?: string;
  views?: number;
}

const categoryPalette: Record<string, string> = {
  politics: "border-red-600 bg-red-50 text-red-700",
  technology: "border-blue-600 bg-blue-50 text-blue-700",
  science: "border-cyan-600 bg-cyan-50 text-cyan-700",
  health: "border-emerald-600 bg-emerald-50 text-emerald-700",
  environment: "border-green-600 bg-green-50 text-green-700",
  economy: "border-amber-600 bg-amber-50 text-amber-700",
  sports: "border-orange-600 bg-orange-50 text-orange-700",
  entertainment: "border-fuchsia-600 bg-fuchsia-50 text-fuchsia-700",
  news: "border-slate-700 bg-slate-100 text-slate-700",
};

export function getCategoryClass(category?: string) {
  return categoryPalette[(category || "news").toLowerCase()] || categoryPalette.news;
}

export function CategoryPill({ category, className }: { category: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border-l-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
        getCategoryClass(category),
        className
      )}
    >
      {category || "News"}
    </span>
  );
}

export function LiveUpdateBadge({ label = "Live updates" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
      </span>
      {label}
    </span>
  );
}

export function SectionHeader({
  kicker,
  title,
  description,
  actionHref,
  actionLabel = "View all",
}: {
  kicker?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-red-700">
            {kicker}
          </p>
        )}
        <h2 className="font-display text-3xl font-bold leading-tight text-slate-950 md:text-4xl">
          {title}
        </h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>}
      </div>
      {actionHref && (
        <Link
          to={actionHref}
          className="inline-flex items-center gap-2 text-sm font-bold text-red-700 transition-colors hover:text-red-900"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export function BreakingTicker({ items }: { items: StoryPreview[] }) {
  const tickerItems = items.slice(0, 5);

  return (
    <div className="border-b border-slate-200 bg-slate-950 text-white">
      <div className="news-container flex flex-col gap-2 py-3 md:flex-row md:items-center">
        <div className="flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-200">
          <Radio className="h-4 w-4 text-red-500" />
          Breaking
        </div>
        <div className="flex min-w-0 gap-4 overflow-x-auto text-sm text-slate-200">
          {tickerItems.length > 0 ? (
            tickerItems.map((item) => (
              <Link
                key={item.id}
                to={`/article/${item.id}`}
              className="shrink-0 border-l border-white/15 pl-4 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {item.title}
              </Link>
            ))
          ) : (
            <span className="text-slate-400">Verified updates will appear here as stories are published.</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function StoryRail({
  title,
  items,
  numbered = true,
  icon: Icon = Flame,
}: {
  title: string;
  items: StoryPreview[];
  numbered?: boolean;
  icon?: typeof Flame;
}) {
  return (
    <aside className="editorial-card editorial-card-hover p-5">
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-red-600" />
          <h3 className="font-display text-xl font-bold text-slate-950">{title}</h3>
        </div>
        <LiveUpdateBadge label="Live" />
      </div>
      <div className="space-y-1">
        {items.length > 0 ? (
          items.slice(0, 5).map((item, index) => (
            <Link
              key={item.id}
              to={`/article/${item.id}`}
              className="group flex cursor-pointer gap-3 rounded-md px-2 py-3 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-red-600"
            >
              {numbered && (
                <span className="w-8 shrink-0 text-xl font-bold tabular-nums text-slate-300 transition-colors group-hover:text-red-600">
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}
              <div className="min-w-0">
                <CategoryPill category={item.category} className="mb-2 py-0.5" />
                <h4 className="line-clamp-2 text-sm font-bold leading-5 text-slate-950 transition-colors group-hover:text-red-700">
                  {item.title}
                </h4>
                {item.author && <p className="mt-1 truncate text-xs text-slate-500">{item.author}</p>}
              </div>
            </Link>
          ))
        ) : (
          <p className="py-6 text-sm text-slate-500">No stories available yet.</p>
        )}
      </div>
    </aside>
  );
}

export function ArticleSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="editorial-card overflow-hidden">
          <div className="aspect-video animate-pulse bg-slate-200" />
          <div className="space-y-3 p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-5 w-4/5 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrendingTags({
  tags,
  activeTag,
  onSelect,
}: {
  tags: string[];
  activeTag?: string;
  onSelect?: (tag: string) => void;
}) {
  const visibleTags = tags.filter(Boolean).slice(0, 12);

  return (
    <div className="editorial-card editorial-card-hover p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        <TrendingUp className="h-4 w-4 text-red-600" />
        Trending Tags
      </div>
      <div className="flex flex-wrap gap-2">
        {visibleTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onSelect?.(tag)}
            className={cn(
              "cursor-pointer rounded-md border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-red-600",
              activeTag === tag
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            )}
          >
            {tag}
          </button>
        ))}
        {visibleTags.length === 0 && <span className="text-sm text-slate-500">Tags will appear as articles are published.</span>}
      </div>
    </div>
  );
}

export function NewsletterPanel() {
  return (
    <section className="border-y border-slate-200 bg-white py-12">
      <div className="news-container">
        <div className="grid gap-6 rounded-lg bg-slate-950 p-6 text-white shadow-xl md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-200">
              <Mail className="h-4 w-4 text-red-500" />
              Newsroom Briefing
            </div>
            <h2 className="font-display text-3xl font-bold leading-tight md:text-4xl">
              Get the day&apos;s verified stories in one clear briefing.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              A calm digest for readers who want context, not noise.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-[420px]">
            <label className="sr-only" htmlFor="newsletter-email">Email address</label>
            <input
              id="newsletter-email"
              type="email"
              placeholder="you@example.com"
              className="h-11 flex-1 rounded-md border border-white/10 bg-white px-3 text-sm text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            />
            <Button type="button" className="h-11 rounded-md bg-red-600 text-white hover:bg-red-700">
              Subscribe
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DiscoveryEmptyState({
  title,
  description,
  onReset,
}: {
  title: string;
  description: string;
  onReset?: () => void;
}) {
  return (
    <div className="editorial-card px-4 py-20 text-center">
      <Search className="mx-auto mb-4 h-12 w-12 text-slate-300" />
      <h3 className="mb-2 font-display text-xl font-bold text-slate-950">{title}</h3>
      <p className="mx-auto mb-6 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {onReset && (
        <Button type="button" variant="outline" className="rounded-md" onClick={onReset}>
          Clear Filters
        </Button>
      )}
    </div>
  );
}

export function StoryMeta({
  readTime,
  publishedAt,
  views,
}: {
  readTime?: string;
  publishedAt?: string;
  views?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
      {publishedAt && <span>{publishedAt}</span>}
      {readTime && (
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {readTime}
        </span>
      )}
      {views !== undefined && <span>{views.toLocaleString()} reads</span>}
      <span className="inline-flex items-center gap-1 text-slate-400">
        <Bookmark className="h-3.5 w-3.5" />
        Save
      </span>
    </div>
  );
}
