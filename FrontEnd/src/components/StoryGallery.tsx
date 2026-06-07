import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Maximize2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type GalleryImage = {
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
};

export function StoryGallery({ images }: { images: GalleryImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const open = useCallback((i: number) => setOpenIndex(i), []);
  const close = useCallback(() => setOpenIndex(null), []);
  const next = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i + 1) % images.length)),
    [images.length]
  );
  const prev = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length)),
    [images.length]
  );

  // Keyboard nav
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIndex, close, next, prev]);

  // Touch swipe
  const touchStart = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => (touchStart.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(delta) > 50) (delta < 0 ? next : prev)();
    touchStart.current = null;
  };

  if (!images || images.length === 0) return null;

  const featured = images[0];
  const supporting = images.slice(1);
  const visible = showAll ? supporting : supporting.slice(0, 4);

  return (
    <section
      aria-label="Investigation photo story"
      className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 mb-10"
    >
      <div className="py-10">
        <div className="mb-8 flex items-end justify-end gap-4">
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 sm:inline-flex">
            <ImageIcon className="h-3.5 w-3.5" />
            <span className="tabular-nums">{images.length} photos</span>
          </span>
        </div>

        <div className="grid gap-3 sm:gap-4 md:grid-cols-3 md:grid-rows-2 md:[grid-auto-rows:1fr]">
          {/* Featured */}
          <button
            onClick={() => open(0)}
            className="group relative col-span-1 row-span-2 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900 text-left md:col-span-2"
            aria-label={`Open photo 1`}
          >
            <div className="aspect-[4/3] md:aspect-auto md:h-full">
              <img
                src={featured.src}
                alt={featured.alt || "Featured image"}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                onLoad={(e) => ((e.target as HTMLImageElement).style.opacity = "1")}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-90" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                Featured · 1 / {images.length}
              </span>
              {featured.caption && (
                <p className="mt-3 max-w-xl font-serif text-lg font-semibold leading-snug text-white sm:text-2xl">
                  {featured.caption}
                </p>
              )}
              {featured.credit && (
                <p className="mt-1 text-[11px] uppercase tracking-wider text-white/70">{featured.credit}</p>
              )}
            </div>
            <div className="pointer-events-none absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
              <Maximize2 className="h-4 w-4" />
            </div>
          </button>

          {/* Supporting */}
          {visible.map((img, idx) => (
            <button
              key={img.src + idx}
              onClick={() => open(idx + 1)}
              className="group relative overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900 text-left"
              aria-label={`Open photo ${idx + 2}`}
            >
              <div className="aspect-[4/3]">
                <img
                  src={img.src}
                  alt={img.alt || `Photo ${idx + 2}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                {img.caption && <p className="line-clamp-2 text-xs font-medium text-white">{img.caption}</p>}
              </div>
              <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-white backdrop-blur">
                {idx + 2}
              </span>
            </button>
          ))}
        </div>

        {supporting.length > 4 && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setShowAll((v) => !v)}
              className="rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-5 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 transition-all hover:-translate-y-0.5 hover:border-red-600/40 hover:text-red-600 focus:outline-none"
            >
              {showAll ? "Show less" : `View all ${images.length} photos`}
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo gallery viewer"
          className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-sm animate-in fade-in"
          onClick={close}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-4 py-4 text-white sm:px-6"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium tabular-nums">
              {openIndex + 1} / {images.length}
            </span>
            <button
              onClick={close}
              aria-label="Close gallery"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Image area */}
          <div className="relative flex flex-1 items-center justify-center px-2 sm:px-6">
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              aria-label="Previous photo"
              className="absolute left-2 z-10 hidden h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/15 sm:left-6 sm:flex"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <img
              key={openIndex}
              src={images[openIndex].src}
              alt={images[openIndex].alt}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "max-h-[85vh] max-w-full select-none rounded-lg object-contain shadow-2xl",
                "animate-in fade-in zoom-in-95 duration-200"
              )}
              draggable={false}
            />

            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              aria-label="Next photo"
              className="absolute right-2 z-10 hidden h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/15 sm:right-6 sm:flex"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
          
          <div className="p-4 text-center text-white/70 text-sm">
            {images[openIndex].caption}
          </div>
        </div>
      )}
    </section>
  );
}