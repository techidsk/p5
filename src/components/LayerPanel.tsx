import { useImageStore } from "../store/imageStore";
import { useCanvasKitStore } from "../store/canvasKitStore";
import { uploadImage } from "../utils/imageOperations";
import { useRef } from "react";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { BLEND_MODES, BlendModeName } from "../types/image";

export function LayerPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getCanvasKit } = useCanvasKitStore();

  const {
    images,
    selectedImage,
    addImage,
    selectImage,
    deleteImage,
    updateImageContent,
    clearAllImages,
  } = useImageStore();

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const canvasKit = getCanvasKit();
    if (!canvasKit || !event.target.files?.[0]) return;

    try {
      const { image, id } = await uploadImage(event.target.files[0], canvasKit);
      addImage(image, event.target.files[0].name);
    } catch (error) {
      console.error("Failed to upload image:", error);
    }
  };

  return (
    <div className="w-128 bg-white shadow-lg p-4 fixed right-0 top-0 h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-gray-800 text-lg">图层</h2>
        <div className="flex gap-2">
          <button
            className="bg-gray-600 hover:bg-gray-800"
            onClick={clearAllImages}
            title="清除所有图层"
          >
            <Trash2 className="w-5 h-5 text-gray-100" />
          </button>
          <button
            className="bg-gray-600 hover:bg-gray-800"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="w-5 h-5 text-gray-100" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {images.map((image) => (
          <div
            key={image.id}
            className={`p-2 border rounded ${
              selectedImage?.id === image.id
                ? "border-blue-500"
                : "border-gray-200"
            }`}
            onClick={() => selectImage(image.id)}
          >
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-800">{image.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateImageContent(image.id, {
                        x: 0,
                        y: 0,
                        scale: 1,
                        rotation: 0,
                      });
                    }}
                    className="text-gray-500 hover:text-gray-700"
                    title="重置位置和变换"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteImage(image.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                    title="删除图层"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>位置:</span>
                  <span>
                    X: {Math.round(image.x)}, Y: {Math.round(image.y)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>缩放:</span>
                  <span>{(image.scale * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>旋转:</span>
                  <span>{Math.round(image.rotation)}°</span>
                </div>
              </div>
            </div>
            {selectedImage?.id === image.id && (
              <div className="mt-2">
                <select
                  value={image.blendMode || "SrcOver"}
                  onChange={(e) =>
                    updateImageContent(image.id, {
                      blendMode: e.target.value as BlendModeName,
                    })
                  }
                  className="w-full p-1 border rounded"
                >
                  {Object.keys(BLEND_MODES).map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
        ref={fileInputRef}
      />
    </div>
  );
}
