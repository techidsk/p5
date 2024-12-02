import { SkiaCanvas } from "../components/SkiaCanvas";
import { LayerPanel } from "../components/LayerPanel";
import { ExampleLoader } from "../features/examples/ExampleLoader";
import { useCanvasKitStore } from "../store/canvasKitStore";

export default function SkiaPage() {
  const CANVAS_ID = "main-canvas";
  const { getCanvasKit } = useCanvasKitStore();

  return (
    <div className="p-8 relative flex">
      <div className="flex-1 relative">
        <div className="flex flex-col items-center justify-center relative z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <h1 className="text-2xl font-bold mb-4">Skia 演示</h1>
            <ExampleLoader canvasKit={getCanvasKit() || undefined} />
          </div>
        </div>

        <SkiaCanvas canvasId={CANVAS_ID} />
      </div>

      <LayerPanel />
    </div>
  );
}
