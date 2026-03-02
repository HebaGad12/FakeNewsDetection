import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-right"
      expand={true}
      richColors
      style={{ zIndex: 999999 }}
      toastOptions={{
        style: {
          zIndex: 999999,
        },
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error: "group-[.toast]:bg-red-600 group-[.toast]:text-white group-[.toast]:border-red-700",
          success: "group-[.toast]:bg-green-600 group-[.toast]:text-white group-[.toast]:border-green-700",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
