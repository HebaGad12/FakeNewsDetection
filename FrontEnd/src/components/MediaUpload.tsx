import React, { useState, useRef } from "react";
import { Upload, AlertCircle, Video, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  validateMediaFile,
  getAllowedMimeTypes,
  getAllowedExtensions,
  MediaType,
} from "@/lib/mediaUtils";

export interface UploadedMedia {
  file: File;
  preview?: string; // Data URL for images/video thumbnails
  mediaType: MediaType;
  isCopyrighted: boolean;
  id: string; // Unique identifier for this upload session
}

interface MediaUploadProps {
  onMediaSelected: (media: UploadedMedia[]) => void;
  maxFiles?: number;
  maxSizeInMB?: number;
  uploadedMedia?: UploadedMedia[];
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onMediaSelected,
  maxFiles = 10,
  maxSizeInMB = 100,
  uploadedMedia = [],
}) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const generatePreview = async (
    file: File,
    mediaType: MediaType
  ): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (mediaType === "image") {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else if (mediaType === "video") {
        // For videos, create a thumbnail from the first frame
        const video = document.createElement("video");
        const canvas = document.createElement("canvas");
        video.onloadedmetadata = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            resolve(canvas.toDataURL());
          } else {
            resolve(undefined);
          }
        };
        video.src = URL.createObjectURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const processFile = async (file: File): Promise<UploadedMedia | null> => {
    const validation = validateMediaFile(file, maxSizeInMB);

    if (!validation.valid) {
      validation.errors.forEach((error) => toast.error(error));
      return null;
    }

    if (!validation.mediaType) {
      toast.error("Could not determine media type");
      return null;
    }

    try {
      const preview = await generatePreview(file, validation.mediaType);
      return {
        file,
        preview,
        mediaType: validation.mediaType,
        isCopyrighted: false,
        id: `${Date.now()}-${Math.random()}`,
      };
    } catch (error) {
      console.error("Error processing file:", error);
      toast.error("Failed to process file");
      return null;
    }
  };

  const handleFiles = async (files: FileList) => {
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed the limit
    const remainingSlots = maxFiles - uploadedMedia.length;
    if (files.length > remainingSlots) {
      toast.error(
        `You can only upload ${remainingSlots} more file(s). Maximum is ${maxFiles} files.`
      );
      return;
    }

    setIsProcessing(true);
    try {
      const newMedia: UploadedMedia[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const processed = await processFile(file);
        if (processed) {
          newMedia.push(processed);
        }
      }

      if (newMedia.length > 0) {
        const updatedMedia = [...uploadedMedia, ...newMedia];
        onMediaSelected(updatedMedia);
        toast.success(`${newMedia.length} file(s) added successfully`);
      }
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const isAtMaxCapacity = uploadedMedia.length >= maxFiles;

  return (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <Label>Upload Media (Images & Videos)</Label>
        <p className="text-xs text-muted-foreground">
          Upload up to {maxFiles} files, max {maxSizeInMB}MB each
        </p>
      </div>

      {/* Upload Area */}
      {!isAtMaxCapacity && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            dragActive
              ? "border-accent bg-accent/5"
              : "border-border hover:border-accent/50"
          } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            id="media-upload"
            accept={getAllowedMimeTypes()}
            onChange={handleFileInputChange}
            className="hidden"
            multiple
            disabled={isProcessing}
          />
          <label htmlFor="media-upload" className="cursor-pointer block">
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              {isProcessing
                ? "Processing files..."
                : "Drag and drop media files here or click to browse"}
            </p>
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Browse Files"}
            </Button>
          </label>
          <p className="text-xs text-muted-foreground mt-3">
            Supported formats: {getAllowedExtensions()}
          </p>
        </div>
      )}

      {/* Capacity Warning */}
      {isAtMaxCapacity && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Maximum files reached
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              You have uploaded {maxFiles} files. Remove some to add more.
            </p>
          </div>
        </div>
      )}

      {/* Media Summary */}
      {uploadedMedia.length > 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm font-medium text-foreground mb-2">
            {uploadedMedia.length} media file{uploadedMedia.length !== 1 ? "s" : ""} ready to upload
          </p>
          <div className="flex flex-wrap gap-2">
            {uploadedMedia.map((media) => (
              <div
                key={media.id}
                className="inline-flex items-center gap-2 bg-background border border-border rounded-md px-3 py-1"
              >
                {media.mediaType === "image" ? (
                  <ImageIcon className="h-4 w-4 text-blue-500" />
                ) : (
                  <Video className="h-4 w-4 text-purple-500" />
                )}
                <span className="text-xs text-foreground truncate max-w-[200px]">
                  {media.file.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
