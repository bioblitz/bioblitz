"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

interface ImageCropModalProps {
  src: string;
  aspect?: number;
  onConfirm: (blob: Blob) => void;
  onClose: () => void;
}

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))), "image/jpeg", 0.92)
  );
}

export default function ImageCropModal({ src, aspect = 16 / 9, onConfirm, onClose }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(src, croppedAreaPixels);
      onConfirm(blob);
    } catch (e) {
      console.error("Crop failed:", e);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden w-full max-w-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800">
          <span className="text-sm font-semibold text-white">Crop Banner</span>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="relative w-full bg-neutral-900" style={{ height: 320 }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 w-10 shrink-0">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-neutral-400"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-bold text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={processing}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-neutral-600 text-white hover:bg-neutral-500 disabled:opacity-50 transition-colors"
            >
              {processing ? "Processing..." : "Apply Crop"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
