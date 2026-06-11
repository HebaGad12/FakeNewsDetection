import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Clock,
  Eye,
  Flame,
  Globe,
  Heart,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { postsService, Post } from "@/services/postsService";
import {
  ArticleSkeletonGrid,
  BreakingTicker,
  CategoryPill,
  LiveUpdateBadge,
  SectionHeader,
  StoryMeta,
  StoryPreview,
  StoryRail,
} from "@/components/news/NewsPrimitives";

const SECTIONS = [
  { id: "latest", name: "Latest News", icon: Clock },
  { id: "trending", name: "Most Read", icon: Flame },
  { id: "politics", name: "Politics", icon: Globe },
  { id: "technology", name: "Technology", icon: TrendingUp },
  { id: "health", name: "Health", icon: Heart },
];

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const getReadTime = (content: string) =>
  `${Math.max(1, Math.ceil(content.split(/\s+/).length / 200))} min read`;

const toStoryPreview = (post: Post): StoryPreview => ({
  id: post.id,
  title: post.title,
  excerpt: post.content.substring(0, 160) + (post.content.length > 160 ? "..." : ""),
  author: post.authorName,
  category: post.tags?.[0] || "News",
  image: post.media?.[0] ? postsService.getImageUrl(post.media[0].path) : undefined,
  publishedAt: formatDate(post.createdAt),
  readTime: getReadTime(post.content),
  views: post.likesCount || 0,
});

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

  const latestPosts = useMemo(
    () => [...allPosts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [allPosts]
  );

  const trendingPosts = useMemo(
    () => [...allPosts].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0)),
    [allPosts]
  );

  const sectionPosts = useMemo(() => {
    switch (activeSection) {
      case "trending":
        return trendingPosts;
      case "politics":
        return allPosts.filter((post) => post.tags?.some((tag) => tag.toLowerCase() === "politics"));
      case "technology":
        return allPosts.filter((post) => post.tags?.some((tag) => tag.toLowerCase() === "technology"));
      case "health":
        return allPosts.filter((post) => post.tags?.some((tag) => tag.toLowerCase() === "health"));
      default:
        return latestPosts;
    }
  }, [activeSection, allPosts, latestPosts, trendingPosts]);

  const featuredPost = latestPosts[0];
  const secondaryPosts = latestPosts.slice(1, 5);
  const editorPicks = latestPosts.slice(5, 9);
  const categoryBlocks = SECTIONS.slice(2).map((section) => ({
    ...section,
    posts: allPosts
      .filter((post) => post.tags?.some((tag) => tag.toLowerCase() === section.id))
      .slice(0, 3),
  }));

  const featuredStory = featuredPost ? toStoryPreview(featuredPost) : null;
  const secondaryStories = secondaryPosts.map(toStoryPreview);
  const trendingStories = trendingPosts.slice(0, 5).map(toStoryPreview);
  const editorStories = editorPicks.map(toStoryPreview);

  return (
    <div className="editorial-shell">
      <Header />
      <main id="main-content">
        <BreakingTicker items={latestPosts.slice(0, 2).map(toStoryPreview)} />

        <div className="news-container py-8">
          {isLoading ? (
            <ArticleSkeletonGrid count={6} />
          ) : (
            <>
              <section className="mb-12 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-center">
                {featuredStory && (
                  <Link
                    to={`/article/${featuredStory.id}`}
                    className="group relative min-h-[450px] lg:h-full overflow-hidden rounded-lg bg-slate-950 focus-visible:ring-2 focus-visible:ring-red-600"
                  >
                    {featuredStory.image && (
                      <img
                        src={featuredStory.image}
                        alt={featuredStory.title}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 motion-reduce:transition-none group-hover:scale-[1.03]"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/10" />
                    <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                      <div className="mb-4 flex flex-wrap items-center gap-3">
                        <CategoryPill category={featuredStory.category} className="bg-white/95" />
                        <LiveUpdateBadge label="Lead story" />
                      </div>
                      <h1 className="max-w-4xl font-display text-4xl font-bold leading-[1.02] text-white md:text-6xl">
                        {featuredStory.title}
                      </h1>
                      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
                        {featuredStory.excerpt}
                      </p>
                      <div className="mt-5 text-slate-300">
                        <StoryMeta
                          publishedAt={featuredStory.publishedAt}
                          readTime={featuredStory.readTime}
                          views={featuredStory.views}
                        />
                      </div>
                    </div>
                  </Link>
                )}

                <div className="grid gap-4">
                  {secondaryStories.map((story) => (
                    <Link
                      key={story.id}
                      to={`/article/${story.id}`}
                      className="group grid cursor-pointer grid-cols-[112px_1fr] gap-4 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-red-200 hover:bg-red-50/40 focus-visible:ring-2 focus-visible:ring-red-600"
                    >
                      <div className="aspect-square overflow-hidden rounded-md bg-slate-100">
                        {story.image && (
                          <img
                            src={story.image}
                            alt={story.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <CategoryPill category={story.category} className="mb-2 py-0.5" />
                        <h2 className="line-clamp-3 font-display text-xl font-bold leading-tight text-slate-950 group-hover:text-red-700">
                          {story.title}
                        </h2>
                        <p className="mt-2 text-xs text-slate-500">{story.author} / {story.publishedAt}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="mb-12">
                <div>
                  <div className="mb-6 border-b border-slate-200">
                    <div className="flex gap-1 overflow-x-auto">
                      {SECTIONS.map((section) => (
                        <button
                          key={section.id}
                          type="button"
                          aria-pressed={activeSection === section.id}
                          onClick={() => setActiveSection(section.id)}
                          className={cn(
                            "-mb-px flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-red-600",
                            activeSection === section.id
                              ? "border-red-600 text-slate-950"
                              : "border-transparent text-slate-500 hover:text-slate-800"
                          )}
                        >
                          <section.icon className="h-4 w-4" />
                          {section.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {sectionPosts.slice(0, 6).map((post) => {
                      const story = toStoryPreview(post);
                      return (
                        <Link
                          key={story.id}
                          to={`/article/${story.id}`}
                          className="group block cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-red-600"
                        >
                          <div className="mb-3 aspect-video overflow-hidden rounded-lg bg-slate-100">
                            {story.image && (
                              <img
                                src={story.image}
                                alt={story.title}
                                className="h-full w-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.03]"
                              />
                            )}
                          </div>
                          <CategoryPill category={story.category} className="mb-2" />
                          <h3 className="mb-2 line-clamp-2 font-display text-2xl font-bold leading-tight text-slate-950 transition-colors group-hover:text-red-700">
                            {story.title}
                          </h3>
                          <p className="mb-3 line-clamp-2 text-sm leading-6 text-slate-600">{story.excerpt}</p>
                          <StoryMeta publishedAt={story.publishedAt} readTime={story.readTime} views={story.views} />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section className="mb-12">
                <SectionHeader
                  kicker="Explore"
                  title="Category highlights"
                  description="Scan the beats shaping today's conversation."
                />
                <div className="grid gap-6 md:grid-cols-3">
                  {categoryBlocks.map((block) => (
                    <div key={block.id} className="editorial-card editorial-card-hover p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <block.icon className="h-5 w-5 text-red-600" />
                        <h3 className="font-display text-2xl font-bold text-slate-950">{block.name}</h3>
                      </div>
                      <div className="space-y-4">
                        {block.posts.length > 0 ? (
                          block.posts.map((post) => (
                            <Link key={post.id} to={`/article/${post.id}`} className="group block border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
                              <h4 className="line-clamp-2 text-sm font-bold leading-5 text-slate-950 group-hover:text-red-700">
                                {post.title}
                              </h4>
                              <p className="mt-1 text-xs text-slate-500">{post.authorName} / {formatDate(post.createdAt)}</p>
                            </Link>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">No stories in this section yet.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="text-center">
                <Link to="/feed">
                  <Button variant="outline" className="rounded-md border-slate-300 px-8 text-slate-700 hover:border-red-600 hover:text-red-700">
                    Browse all articles
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;