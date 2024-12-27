import { useImageStore } from "../store/imageStore";
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { Move } from "lucide-react";
import { useCanvasKitStore } from "../store/canvasKitStore";
import type { BlendModeName } from "../types/image";

interface MiniCanvasProps {
  projectId: string;
  width: number;
  height: number;
  className?: string;
}

interface Position {
  x: number;
  y: number;
}

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEEAD",
  "#D4A5A5",
  "#9B59B6",
  "#3498DB",
  "#E67E22",
  "#2ECC71",
];

export function MiniCanvas({
  projectId,
  width,
  height,
  className = "",
}: MiniCanvasProps) {
  const { images, canvasWidth, canvasHeight } = useImageStore();
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<Position>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { initialize, createSurface, getSurface, getCanvasKit, cleanup } =
    useCanvasKitStore();

  const surfaceId = `mini-canvas-${projectId}`;

  // 计算缩放比例
  const scale = useMemo(() => {
    if (!canvasWidth || !canvasHeight) return 1;
    const scaleX = width / canvasWidth;
    const scaleY = height / canvasHeight;
    return Math.min(scaleX, scaleY);
  }, [width, height, canvasWidth, canvasHeight]);

  // 计算实际显示尺寸
  const displayWidth = canvasWidth * scale;
  const displayHeight = canvasHeight * scale;

  // 处理拖动逻辑
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) return; // 如果点击的是画布，不处理拖动
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;

    const maxX = window.innerWidth - displayWidth - 20;
    const maxY = window.innerHeight - displayHeight - 20;

    setPosition({
      x: Math.max(20, Math.min(maxX, newX)),
      y: Math.max(20, Math.min(maxY, newY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 绘制画布内容
  const drawImages = useCallback(() => {
    const surface = getSurface(projectId, surfaceId);
    const canvasKit = getCanvasKit();
    if (!surface || !canvasKit || !canvasRef.current) return;

    const canvas = surface.getCanvas();
    canvas.clear(canvasKit.WHITE); // 使用白色背景

    // 应用缩放
    canvas.save();
    canvas.scale(scale, scale);

    images.forEach((img) => {
      if (!img.image) return;

      canvas.save();
      const paint = new canvasKit.Paint();

      if (img.blendMode) {
        const blendMode = canvasKit.BlendMode[img.blendMode as BlendModeName];
        paint.setBlendMode(
          "value" in blendMode ? blendMode : canvasKit.BlendMode.Src
        );
      }

      paint.setAlphaf(img.opacity || 1);
      canvas.drawImage(img.image, img.x, img.y, paint);
      paint.delete();
      canvas.restore();
    });

    canvas.restore();
    surface.flush();
  }, [getSurface, getCanvasKit, images, scale, projectId, surfaceId]);

  // 初始化 CanvasKit
  useEffect(() => {
    if (!canvasRef.current) return;

    const surfaceId = `mini-canvas-${projectId}`;
    canvasRef.current.width = displayWidth;
    canvasRef.current.height = displayHeight;

    createSurface(projectId, surfaceId, displayWidth, displayHeight);
    drawImages();

    return () => {
      console.log("执行清理");
      cleanup();
    };
  }, [
    projectId,
    displayWidth,
    displayHeight,
    createSurface,
    cleanup,
    drawImages,
  ]);

  // 当图片或变换更新时重绘
  useEffect(() => {
    drawImages();
  }, [drawImages, images]);

  return (
    <div
      className={`fixed shadow-lg rounded-lg overflow-hidden border border-gray-300 ${className}`}
      style={{
        right: position.x,
        bottom: position.y,
        width: displayWidth,
        height: displayHeight,
        cursor: isDragging ? "grabbing" : "grab",
        backgroundColor: "white",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        id="mini-canvas"
        className="absolute inset-0"
        width={displayWidth}
        height={displayHeight}
      />
      <div className="absolute top-0 right-0 p-1 bg-white/90 rounded-bl cursor-move border-l border-b border-gray-200">
        <Move className="w-4 h-4 text-gray-600" />
      </div>
    </div>
  );
}
