import React from "react";
import { X, Image as ImageIcon, Video, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UploadedMedia } from "./MediaUpload";

interface MediaListProps {
  media: UploadedMedia[];
  onRemove: (mediaId: string) => void;
  onToggleCopyright: (mediaId: string, isCopyrighted: boolean) => void;
}

export const MediaList: React.FC<MediaListProps> = ({
  media,
  onRemove,
  onToggleCopyright,
}) => {
  if (media.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Label>Uploaded Media</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {media.map((item) => (
          <div
            key={item.id}
            className="bg-card border border-border rounded-lg overflow-hidden hover:border-accent/50 transition-colors"
          >
            {/* Media Preview */}
            <div className="relative w-full bg-muted aspect-video overflow-hidden">
              {item.preview ? (
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  {item.mediaType === "image" ? (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    <Video className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
              )}

              {/* Media Type Badge */}
              <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                {item.mediaType === "image" ? (
                  <>
                    <ImageIcon className="h-3 w-3" />
                    Image
                  </>
                ) : (
                  <>
                    <Video className="h-3 w-3" />
                    Video
                  </>
                )}
              </div>

              {/* Remove Button */}
              <button
                onClick={() => onRemove(item.id)}
                className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                title="Remove media"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Media Info */}
            <div className="p-3 space-y-3">
              {/* Filename */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">File</p>
                <p className="text-sm font-medium text-foreground truncate" title={item.file.name}>
                  {item.file.name}
                </p>
              </div>

              {/* File Size */}
              <div>
                <p className="text-xs text-muted-foreground">
                  {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>

              {/* Copyright Toggle */}
              <div className="bg-muted/50 rounded-md p-2.5 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={item.isCopyrighted}
                    onChange={(e) => onToggleCopyright(item.id, e.target.checked)}
                    className="h-4 w-4 rounded border-border cursor-pointer"
                  />
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    {item.isCopyrighted ? (
                      <>
                        <Lock className="h-3.5 w-3.5 text-blue-500" />
                        Copyrighted
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3.5 w-3.5 text-gray-500" />
                        Not Copyrighted
                      </>
                    )}
                  </span>
                </label>
                <p className="text-xs text-muted-foreground leading-tight">
                  {item.isCopyrighted
                    ? "Only you can reuse this media"
                    : "Others can use this media"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
