import type { CanvasKit, Image as SkImage } from "canvaskit-wasm";
import { useImageDBStore } from "../store/imageDBStore";

export async function uploadImage(
  file: File,
  canvasKit: CanvasKit
): Promise<{ image: SkImage; id: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const image = canvasKit.MakeImageFromEncoded(new Uint8Array(arrayBuffer));

  if (!image) {
    throw new Error("Failed to create image");
  }

  const imageId = crypto.randomUUID();
  const { saveImage } = useImageDBStore.getState();
  await saveImage(imageId, arrayBuffer);

  return { image, id: imageId };
}

export async function createImageFromUrl(
  url: string,
  canvasKit: CanvasKit
): Promise<SkImage> {
  const response = await fetch(url);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const image = canvasKit.MakeImageFromEncoded(new Uint8Array(arrayBuffer));

  if (!image) {
    throw new Error("Failed to create image from URL");
  }

  return image;
} 