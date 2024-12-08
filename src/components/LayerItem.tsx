import React from "react";
import type { ImageObject } from "../types/image";

// 混合模式选项
export const BLEND_MODES = {
  normal: "SrcOver",
  multiply: "Multiply",
  screen: "Screen",
  overlay: "Overlay",
  darken: "Darken",
  lighten: "Lighten",
  "color-dodge": "ColorDodge",
  "color-burn": "ColorBurn",
  "hard-light": "HardLight",
  "soft-light": "SoftLight",
  difference: "Difference",
  exclusion: "Exclusion",
  hue: "Hue",
  saturation: "Saturation",
  color: "Color",
  luminosity: "Luminosity",
} as const;

export type BlendMode = (typeof BLEND_MODES)[keyof typeof BLEND_MODES];

interface LayerItemProps {
  image: ImageObject;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onBlendModeChange: (blendMode: BlendMode) => void;
  onOpacityChange: (opacity: number) => void;
  onReset: () => void;
}

export function LayerItem({
  image,
  index,
  isSelected,
  onSelect,
  onDelete,
  onBlendModeChange,
  onOpacityChange,
  onReset,
}: LayerItemProps) {
  const thumbnailRef = React.useRef<HTMLCanvasElement>(null);

  // 生成缩略图
  React.useEffect(() => {
    const canvas = thumbnailRef.current;
    if (!canvas || !image.image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 计算缩放比例以适应缩略图大小
    const scale = Math.min(
      canvas.width / image.image.width(),
      canvas.height / image.image.height()
    );

    // 计算居中位置
    const x = (canvas.width - image.image.width() * scale) / 2;
    const y = (canvas.height - image.image.height() * scale) / 2;

    // 绘制缩略图
    // 注意：这里需要将 Skia Image 转换为浏览器可用的图像数据
    // 这部分可能需要根据你的具体实现调整
  }, [image]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-end gap-2">
        <div className="flex items-center gap-1 min-w-[100px]">
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round((image.opacity || 1) * 100)}
            onChange={(e) => {
              e.stopPropagation();
              onOpacityChange(Number(e.target.value) / 100);
            }}
            className="w-full"
            onClick={(e) => e.stopPropagation()}
            title="透明度"
          />
          <span className="text-xs text-gray-500 w-8">
            {Math.round((image.opacity || 1) * 100)}%
          </span>
        </div>

        <select
          className="text-sm border rounded px-1"
          value={image.blendMode || "normal"}
          onChange={(e) => onBlendModeChange(e.target.value as BlendMode)}
        >
          {Object.keys(BLEND_MODES).map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </div>
      <div
        className={`
        p-2 border rounded flex items-center gap-2 cursor-pointer
        ${isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"}
      `}
        onClick={onSelect}
      >
        {/* 缩略图 */}
        <canvas
          ref={thumbnailRef}
          width={40}
          height={40}
          className="border border-gray-200 rounded"
        />

        <div className="flex-1">
          <div className="text-sm font-medium text-gray-800">
            图层 {index} - {image.name}
          </div>
          <div className="text-xs text-gray-500">
            {Math.round(image.x)}, {Math.round(image.y)}
          </div>
        </div>

        <button
          className="text-gray-400 hover:text-gray-600"
          onClick={(e) => {
            e.stopPropagation();
            onReset();
          }}
          title="重置图层"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>

        <button
          className="text-gray-400 hover:text-gray-600"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
