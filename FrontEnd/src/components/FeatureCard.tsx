import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index?: number;
  className?: string;
}

export function FeatureCard({ icon: Icon, title, description, index = 0, className }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className={cn(
        "group relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-red-200 hover:shadow-lg",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-red-600 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-950 transition-colors duration-300 group-hover:bg-red-600">
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <h3 className="relative mb-2 font-display text-xl font-semibold text-slate-950">
        {title}
      </h3>
      <p className="relative text-sm leading-6 text-slate-600">
        {description}
      </p>
    </motion.div>
  );
}
