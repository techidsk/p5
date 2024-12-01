import { useCallback } from "react";
import type { CanvasKit, Image as SkImage } from "canvaskit-wasm";
import { useImageStore } from "../../store/imageStore";
import { applyDisplacement } from "../../utils/displacement";

interface DisplacementHandlerProps {
  canvasKit: CanvasKit;
  sourceImage: SkImage;
  onComplete: (result: SkImage) => void;
}

export function DisplacementHandler({
  canvasKit,
  sourceImage,
  onComplete,
}: DisplacementHandlerProps) {
  const { createDerivedImage } = useImageStore();

  const handleDisplacementSelect = useCallback(async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const dispImage = canvasKit.MakeImageFromEncoded(new Uint8Array(arrayBuffer));

      if (!dispImage) {
        throw new Error("Failed to create displacement map");
      }

      const maskInput = document.createElement("input");
      maskInput.type = "file";
      maskInput.accept = "image/*";
      maskInput.style.display = "none";
      document.body.appendChild(maskInput);

      maskInput.onchange = async (e) => {
        const maskFile = (e.target as HTMLInputElement).files?.[0];
        if (maskFile) {
          const maskArrayBuffer = await maskFile.arrayBuffer();
          const maskImage = canvasKit.MakeImageFromEncoded(
            new Uint8Array(maskArrayBuffer)
          );

          if (maskImage) {
            const tempSurface = canvasKit.MakeSurface(
              sourceImage.width(),
              sourceImage.height()
            );

            if (tempSurface) {
              applyDisplacement(canvasKit, tempSurface, {
                sourceImage,
                displacementMap: dispImage,
                maskImage,
                strength: 50,
              });

              const snapshot = tempSurface.makeImageSnapshot();
              createDerivedImage(snapshot, "置换效果(带遮罩)");
              onComplete(snapshot);

              tempSurface.delete();
              maskImage.delete();
            }
          }
        }
        document.body.removeChild(maskInput);
      };

      maskInput.click();
    } catch (error) {
      console.error("处理置换效果时出错:", error);
    }
  }, [canvasKit, sourceImage, createDerivedImage, onComplete]);

  return null; // This is a logic-only component
} 