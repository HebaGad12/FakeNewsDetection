import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  message?: string;
}

export function LoadingSpinner({ 
  size = "md", 
  fullScreen = false, 
  message 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className={cn("rounded-md bg-slate-950 p-2", sizeClasses[size])}
      >
        <Shield className="h-full w-full text-white" />
      </motion.div>
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-medium text-slate-600"
        >
          {message}
        </motion.p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        {content}
      </div>
    );
  }

  return content;
}
