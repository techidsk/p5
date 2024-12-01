import { useCallback, useEffect, useRef } from "react";
import type { BlendMode, CanvasKit } from "canvaskit-wasm";
import { useCanvasKitStore } from "../store/canvasKitStore";
import { useImageStore } from "../store/imageStore";
import type { BLEND_MODES, ImageObject } from "../types/image";

interface SkiaCanvasProps {
  canvasId: string;
  onImageClick?: (image: ImageObject) => void;
}

export function SkiaCanvas({ canvasId, onImageClick }: SkiaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragState = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    imageId: string;
  } | null>(null);

  const {
    initialize,
    createSurface,
    resizeSurface,
    getActiveSurface,
    getCanvasKit,
    cleanup,
    transform,
    isPanning,
    startPanning,
    updatePanning,
    stopPanning,
    handleWheel: handleWheelStore,
  } = useCanvasKitStore();

  const { images, clearSelection, updateImageContent, findTopImageAtPoint } =
    useImageStore();

  // 定义有效的混合模式字符串类型
  type BlendModeName = keyof typeof BLEND_MODES;

  const getBlendMode = (canvasKit: CanvasKit, mode: BlendModeName) => {
    const blendMode = canvasKit.BlendMode[mode];
    return "value" in blendMode ? blendMode : canvasKit.BlendMode.Src;
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (e.button === 1) {
      startPanning(e.clientX, e.clientY);
      return;
    }

    const adjustedX = (e.clientX - rect.left - transform.x) / transform.scale;
    const adjustedY = (e.clientY - rect.top - transform.y) / transform.scale;

    const hitImage = findTopImageAtPoint(adjustedX, adjustedY);

    if (hitImage) {
      dragState.current = {
        isDragging: true,
        startX: adjustedX - hitImage.x,
        startY: adjustedY - hitImage.y,
        imageId: hitImage.id,
      };
      onImageClick?.(hitImage);
    } else {
      clearSelection();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (isPanning) {
      updatePanning(e.clientX, e.clientY);
      return;
    }

    if (dragState.current?.isDragging) {
      const adjustedX = (e.clientX - rect.left - transform.x) / transform.scale;
      const adjustedY = (e.clientY - rect.top - transform.y) / transform.scale;

      // 使用 requestAnimationFrame 优化性能
      requestAnimationFrame(() => {
        updateImageContent(dragState.current!.imageId, {
          x: adjustedX - dragState.current!.startX,
          y: adjustedY - dragState.current!.startY,
        });
      });
    }
  };

  const handleMouseUp = () => {
    stopPanning();
    dragState.current = null;
  };

  // Handle resize
  const handleResize = useCallback(() => {
    if (canvasRef.current) {
      const width = window.innerWidth;
      const height = window.innerHeight;

      const canvasKit = getCanvasKit();
      if (!canvasKit) return;

      canvasRef.current.width = width;
      canvasRef.current.height = height;
      resizeSurface(canvasId);
      drawImages();
    }
  }, [canvasId, resizeSurface, getCanvasKit]);

  // Draw images
  const drawImages = useCallback(() => {
    const surface = getActiveSurface();
    const canvasKit = getCanvasKit();
    if (!surface || !canvasKit) return;

    const canvas = surface.getCanvas();
    canvas.clear(canvasKit.TRANSPARENT);

    canvas.save();
    canvas.translate(transform.x, transform.y);
    canvas.scale(transform.scale, transform.scale);

    images.forEach((img) => {
      if (!img.image || !img.image.width) return;

      canvas.save();
      const paint = new canvasKit.Paint();
      paint.setAlphaf(img.opacity || 1);

      if (img.blendMode) {
        paint.setBlendMode(getBlendMode(canvasKit, img.blendMode as BlendModeName));
      }

      canvas.drawImage(img.image, img.x, img.y, paint);
      paint.delete();
      canvas.restore();
    });

    canvas.restore();
    surface.flush();
  }, [getActiveSurface, getCanvasKit, images, transform]);

  // Initialize CanvasKit
  useEffect(() => {
    if (!canvasRef.current) return;

    canvasRef.current.width = window.innerWidth;
    canvasRef.current.height = window.innerHeight;

    import("canvaskit-wasm").then(({ default: CanvasKitInit }) => {
      CanvasKitInit({
        locateFile: (file) => `/node_modules/canvaskit-wasm/bin/${file}`,
      }).then((CK: CanvasKit) => {
        initialize(CK);
        if (canvasRef.current) {
          createSurface(
            canvasId,
            canvasRef.current.width,
            canvasRef.current.height
          );
        }
      });
    });

    return () => cleanup();
  }, [canvasId, initialize, createSurface, cleanup]);

  // Handle window resize
  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  // Draw images when they change
  useEffect(() => {
    drawImages();
  }, [drawImages]);

  // Handle wheel events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      handleWheelStore(e.deltaY, e.ctrlKey, clientX, clientY);
    };

    canvas.addEventListener("wheel", wheelHandler, { passive: false });
    return () => canvas.removeEventListener("wheel", wheelHandler);
  }, [handleWheelStore]);

  return (
    <canvas
      ref={canvasRef}
      id={canvasId}
      style={{ width: "100%", height: "100%" }}
      className="fixed top-0 left-0"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}
