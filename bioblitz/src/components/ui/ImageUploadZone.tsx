"use client";

import React, { useCallback, useEffect, useState } from "react";

interface ImageUploadZoneProps {
  onFile: (file: File) => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps children with drag-and-drop and global paste support for image uploads.
 * Paste fires when the active element is not a text field or contenteditable.
 */
export default function ImageUploadZone({
  onFile,
  children,
  className,
}: ImageUploadZoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File | null | undefined) => {
      if (file && file.type.startsWith("image/")) {
        onFile(file);
      }
    },
    [onFile],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const active = document.activeElement;
      const tag = active?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((active as HTMLElement)?.isContentEditable) return;

      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFile]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`${className ?? ""} ${
        dragging
          ? "ring-2 ring-neutral-400 ring-offset-2 ring-offset-neutral-900 rounded-lg"
          : ""
      }`}
    >
      {children}
    </div>
  );
}
