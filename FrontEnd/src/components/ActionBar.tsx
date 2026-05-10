import { Heart, MessageCircle, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionButtonProps {
  icon: typeof Heart;
  label: string;
  count?: number;
  active?: boolean;
  activeColor?: string;
  onClick?: () => void;
  disabled?: boolean;
}

function ActionButton({
  icon: Icon, label, count, active, activeColor, onClick, disabled
}: ActionButtonProps) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className={cn(
        "group flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-500 dark:text-zinc-400 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50 disabled:pointer-events-none",
        !disabled && "hover:-translate-y-0.5 hover:border-red-600/40 hover:text-zinc-900 dark:hover:text-white"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 transition-transform",
          !disabled && "group-hover:scale-110",
          active && (activeColor ?? "fill-red-600 stroke-red-600 text-red-600")
        )}
      />
      {count !== undefined && (
        <span className="tabular-nums">{count.toLocaleString()}</span>
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

interface ActionBarProps {
  likesCount: number;
  isLiked: boolean;
  onToggleLike: () => void;
  commentsCount: number;
  isLiking: boolean;
  onReport?: () => void;
  canReport?: boolean;
}

export function ActionBar({
  likesCount,
  isLiked,
  onToggleLike,
  commentsCount,
  isLiking,
  onReport,
  canReport
}: ActionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActionButton
        icon={Heart}
        label="Like"
        count={likesCount}
        active={isLiked}
        activeColor="fill-red-600 stroke-red-600 text-red-600"
        onClick={onToggleLike}
        disabled={isLiking}
      />
      <ActionButton icon={MessageCircle} label="Comment" count={commentsCount} />
      {canReport && (
        <ActionButton icon={Flag} label="Report" onClick={onReport} />
      )}
    </div>
  );
}