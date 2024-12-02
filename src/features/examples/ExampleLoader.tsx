import { useCallback } from "react";
import type { CanvasKit } from "canvaskit-wasm";
import { useImageStore } from "../../store/imageStore";
import { useMockupStore } from "../../store/mockupStore";
import { createImageFromUrl } from "../../utils/imageOperations";
import imageList from "../../assets/mock/imageList.json";

interface ExampleLoaderProps {
  canvasKit?: CanvasKit;
}

export function ExampleLoader({ canvasKit }: ExampleLoaderProps) {
  const { addImage } = useImageStore();
  const { saveMockupData, loadMockupById } = useMockupStore();

  const handleLoadExample = useCallback(async () => {
    try {
      const example = imageList.images[0];

      saveMockupData(example.id, {
        main: example.main,
        depth: example.depth,
        mask: example.mask,
        segment: example.segment,
        pattern: example.pattern,
        name: `示例 Mockup ${example.id}`,
      });
      if (!canvasKit) {
        throw new Error("CanvasKit is not initialized");
      }

      const mainImage = await createImageFromUrl(example.main, canvasKit);
      addImage(mainImage, `${example.id}-main`);
      await loadMockupById(example.id, canvasKit);
    } catch (error) {
      console.error("Failed to load example:", error);
    }
  }, [canvasKit, addImage, saveMockupData, loadMockupById]);

  return (
    <button
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      onClick={handleLoadExample}
    >
      加载示例
    </button>
  );
}
