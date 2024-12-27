import { useCallback, useEffect, useRef } from "react";
import type { CanvasKit } from "canvaskit-wasm";
import { useCanvasKitStore } from "../store/canvasKitStore";
import { useImageStore } from "../store/imageStore";
import type { BLEND_MODES, BlendModeName, ImageObject } from "../types/image";

interface SkiaCanvasProps {
  projectId: string;
  surfaceId: string;
  width: number;
  height: number;
  isMiniCanvas?: boolean;
}

export function SkiaCanvas({
  projectId,
  surfaceId,
  width,
  height,
  isMiniCanvas = false
}: SkiaCanvasProps) {
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
    getSurface,
    getCanvasKit,
    cleanup,
    startPanning,
    updatePanning,
    stopPanning,
    handleWheel,
    isPanning,
    getTransform,
    deleteSurface,
  } = useCanvasKitStore();

  const {
    images,
    clearSelection,
    selectImage,
    updateImageContent,
    findTopImageAtPoint,
    handleDrag,
    startDragging,
    stopDragging,
    setOverlapHandlers,
  } = useImageStore();

  // 定义有效的混合模字符串类型
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
      startPanning(projectId, e.clientX, e.clientY);
      return;
    }

    const adjustedX = (e.clientX - rect.left - getTransform(projectId).x) / getTransform(projectId).scale;
    const adjustedY = (e.clientY - rect.top - getTransform(projectId).y) / getTransform(projectId).scale;

    const hitImage = findTopImageAtPoint(adjustedX, adjustedY);

    if (hitImage) {
      dragState.current = {
        isDragging: true,
        startX: adjustedX - hitImage.x,
        startY: adjustedY - hitImage.y,
        imageId: hitImage.id,
      };
    } else {
      clearSelection();
    }
  };

  // 移动鼠标
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (isPanning(projectId)) {
      updatePanning(projectId, e.clientX, e.clientY);
      return;
    }

    if (dragState.current?.isDragging) {
      // 更新图层位置
      const adjustedX = (e.clientX - rect.left - getTransform(projectId).x) / getTransform(projectId).scale;
      const adjustedY = (e.clientY - rect.top - getTransform(projectId).y) / getTransform(projectId).scale;

      updateImageContent(dragState.current.imageId, {
        x: adjustedX - dragState.current.startX,
        y: adjustedY - dragState.current.startY,
      });

      startDragging(adjustedX, adjustedY, rect);
      // 添加重叠检测
      handleDrag(adjustedX, adjustedY, rect);
    }
  };

  const handleMouseUp = () => {
    stopPanning(projectId);
    dragState.current = null;
    stopDragging();
  };

  // Draw images
  const drawImages = useCallback(() => {
    const surface = getSurface(projectId, surfaceId);
    const canvasKit = getCanvasKit();
    if (!surface || !canvasKit) return;

    const canvas = surface.getCanvas();
    canvas.clear(canvasKit.TRANSPARENT);

    canvas.save();
    canvas.translate(getTransform(projectId).x, getTransform(projectId).y);
    canvas.scale(getTransform(projectId).scale, getTransform(projectId).scale);

    images.forEach((img) => {
      if (!img.image || !img.image.width) return;

      console.log("绘制图片", img);

      canvas.save();
      const paint = new canvasKit.Paint();
      paint.setAlphaf(img.opacity || 1);

      if (img.blendMode) {
        paint.setBlendMode(
          getBlendMode(canvasKit, img.blendMode as BlendModeName)
        );
      }

      canvas.drawImage(img.image, img.x, img.y, paint);
      paint.delete();
      canvas.restore();
    });

    canvas.restore();
    surface.flush();
  }, [getSurface, getCanvasKit, images, getTransform, projectId, surfaceId]);

  // Handle resize
  const handleResize = useCallback(() => {
    if (canvasRef.current) {
      const width = window.innerWidth;
      const height = window.innerHeight;

      const canvasKit = getCanvasKit();
      if (!canvasKit) return;

      canvasRef.current.width = width;
      canvasRef.current.height = height;
      
      // 删除旧的 surface 并创建新的
      deleteSurface(projectId, surfaceId);
      createSurface(projectId, surfaceId, width, height);
      drawImages();
    }
  }, [projectId, surfaceId, createSurface, deleteSurface, getCanvasKit, drawImages]);

  // Initialize CanvasKit
  useEffect(() => {
    if (!canvasRef.current) return;

    // 只在主画布时初始化 CanvasKit
    if (!isMiniCanvas) {
      import("canvaskit-wasm").then(({ default: CanvasKitInit }) => {
        CanvasKitInit({
          locateFile: (file) => `/node_modules/canvaskit-wasm/bin/${file}`,
        }).then((CK: CanvasKit) => {
          initialize(CK);
          createSurface(projectId, surfaceId, width, height);
        });
      });
    } else {
      createSurface(projectId, surfaceId, width, height);
    }

    return () => {
      if (!isMiniCanvas) {
        cleanup();
      }
    };
  }, [projectId, surfaceId, width, height, isMiniCanvas]);

  // Handle window resize
  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  // Draw images when they change or transform changes
  useEffect(() => {
    drawImages();
  }, [drawImages, getTransform]);

  // Handle wheel events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      handleWheel(projectId, e.deltaY, e.ctrlKey, clientX, clientY);
    };

    if (!isMiniCanvas) {
      canvas.addEventListener("wheel", wheelHandler, { passive: false });
      return () => canvas.removeEventListener("wheel", wheelHandler);
    }
  }, [projectId, isMiniCanvas]);

  useEffect(() => {
    return () => {
      // 清理所有图像资源
      images.forEach((img) => {
        if (img.image && typeof img.image.delete === "function") {
          img.image.delete();
        }
      });
    };
  }, []);

  // 添加重叠状态的回调
  useEffect(() => {
    const handleEnterOverlap = (
      draggingImage: ImageObject,
      targetImage: ImageObject
    ) => {
      console.log("Enter overlap:", {
        dragging: draggingImage,
        target: targetImage,
      });
      // 保存当前的混合模式并切换为 multiply
      updateImageContent(draggingImage.id, {
        blendMode: "Multiply" as BlendModeName,
      });
      // 从 store 中获取最新状态
      const currentImages = useImageStore.getState().images;
      const updatedImage = useImageStore.getState().selectedImage;

      console.log("updated image", updatedImage);
      console.log("current images", currentImages);
    };

    const handleDragInOverlap = (
      draggingImage: ImageObject,
      targetImage: ImageObject
    ) => {
      // TODO 处理拖拽
      //   console.log("Dragging in overlap:", {
      //     dragging: draggingImage,
      //     target: targetImage,
      //   });
    };

    const handleLeaveOverlap = (draggingImage: ImageObject) => {
      // 恢复之前的混合模式
      updateImageContent(draggingImage.id, {
        blendMode: "SrcOver" as BlendModeName,
      });
      console.log("Leave overlap", {
        dragging: draggingImage,
      });
    };

    // 设置回调
    setOverlapHandlers(
      handleEnterOverlap,
      handleDragInOverlap,
      handleLeaveOverlap
    );

    // 清理回调
    return () => {
      setOverlapHandlers(
        () => {},
        () => {},
        () => {}
      );
    };
  }, [setOverlapHandlers, updateImageContent]);

  return (
    <canvas
      ref={canvasRef}
      id={surfaceId}
      style={{ width: "100%", height: "100%" }}
      className="fixed top-0 left-0"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}
