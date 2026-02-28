import { Shield, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type CredibilityLevel = "verified" | "questionable" | "fake";

interface CredibilityBadgeProps {
  level: CredibilityLevel;
  score?: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const badgeConfig = {
  verified: {
    label: "Verified",
    icon: CheckCircle,
    bgClass: "bg-verified",
    textClass: "text-verified-foreground",
    borderClass: "border-verified/20",
  },
  questionable: {
    label: "Questionable",
    icon: AlertTriangle,
    bgClass: "bg-questionable",
    textClass: "text-questionable-foreground",
    borderClass: "border-questionable/20",
  },
  fake: {
    label: "Fake",
    icon: XCircle,
    bgClass: "bg-fake",
    textClass: "text-fake-foreground",
    borderClass: "border-fake/20",
  },
};

const sizeConfig = {
  sm: {
    container: "px-2 py-0.5 text-xs gap-1",
    icon: "h-3 w-3",
  },
  md: {
    container: "px-3 py-1 text-sm gap-1.5",
    icon: "h-4 w-4",
  },
  lg: {
    container: "px-4 py-1.5 text-base gap-2",
    icon: "h-5 w-5",
  },
};

export function CredibilityBadge({
  level,
  score,
  showLabel = true,
  size = "md",
  className,
}: CredibilityBadgeProps) {
  const config = badgeConfig[level];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full font-medium transition-all",
        config.bgClass,
        config.textClass,
        sizes.container,
        className
      )}
    >
      <Icon className={sizes.icon} />
      {showLabel && <span>{config.label}</span>}
      {score !== undefined && (
        <span className="opacity-80">({score}%)</span>
      )}
    </div>
  );
}

export function CredibilityIndicator({ level }: { level: CredibilityLevel }) {
  const config = badgeConfig[level];
  const Icon = config.icon;

  return (
    <div className={cn("p-2 rounded-lg", config.bgClass, config.textClass)}>
      <Icon className="h-5 w-5" />
    </div>
  );
}
