import { LayerItem, BlendMode } from "./LayerItem";
import { useRef } from "react";
import type { ImageObject } from "../store/imageStore";

interface LayerPanelProps {
  images: ImageObject[];
  selectedImage: string | null;
  onSelectImage: (id: string) => void;
  onDeleteImage: (id: string) => void;
  onAddImage: () => void;
  onApplyDisplacement: (sourceId: string) => void;
  onBlendModeChange: (id: string, blendMode: BlendMode) => void;
  onResetImage: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  onCreateMockup?: (imageId: string) => void;
  onLoadMockup?: (imageId: string) => void;
}

export function LayerPanel({
  images,
  selectedImage,
  onSelectImage,
  onDeleteImage,
  onAddImage,
  onApplyDisplacement,
  onBlendModeChange,
  onResetImage,
  onOpacityChange,
  onCreateMockup,
  onLoadMockup,
}: LayerPanelProps) {
  const displacementInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-128 bg-white shadow-lg p-4 fixed right-0 top-0 h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">图层</h2>
        <div className="flex gap-2">
          <button
            className="text-gray-600 hover:text-gray-800"
            onClick={onAddImage}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
          {selectedImage && (
            <button
              className="text-gray-600 hover:text-gray-800"
              onClick={() => {
                displacementInputRef.current?.click();
              }}
              title="应用置换效果"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.5 10c-2.483 0-4.5 2.017-4.5 4.5s2.017 4.5 4.5 4.5 4.5-2.017 4.5-4.5-2.017-4.5-4.5-4.5zM4 10c-2.483 0-4.5 2.017-4.5 4.5S1.517 19 4 19s4.5-2.017 4.5-4.5S6.483 10 4 10zm7.5-5C8.967 5 7 7.017 7 9.5S8.967 14 11.5 14s4.5-2.017 4.5-4.5S14.033 5 11.5 5z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <input
        type="file"
        accept="image/*"
        ref={displacementInputRef}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && selectedImage) {
            onApplyDisplacement(selectedImage);
            e.target.value = "";
          }
        }}
      />

      <div className="space-y-2">
        {[...images].reverse().map((img, index) => (
          <LayerItem
            key={img.id}
            image={img}
            index={index + 1}
            isSelected={selectedImage === img.id}
            onSelect={() => onSelectImage(img.id)}
            onDelete={() => onDeleteImage(img.id)}
            onBlendModeChange={(blendMode) =>
              onBlendModeChange(img.id, blendMode)
            }
            onReset={() => onResetImage(img.id)}
            onOpacityChange={(opacity) => onOpacityChange(img.id, opacity)}
          />
        ))}
      </div>

      <div className="flex gap-2 mt-2">
        {onCreateMockup && selectedImage && (
          <button
            className="text-sm text-blue-500 hover:text-blue-700"
            onClick={() => onCreateMockup(selectedImage)}
          >
            创建模板
          </button>
        )}
        {onLoadMockup && selectedImage && (
          <button
            className="text-sm text-green-500 hover:text-green-700"
            onClick={() => onLoadMockup(selectedImage)}
          >
            加载模板
          </button>
        )}
      </div>
    </div>
  );
}
