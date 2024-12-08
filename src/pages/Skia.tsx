import { SkiaCanvas } from "../components/SkiaCanvas";
import { LayerPanel } from "../components/LayerPanel";
import { MiniCanvas } from "../components/MiniCanvas";

export default function SkiaPage() {
  return (
    <div className="p-8 relative flex">
      <div className="flex-1 relative">
        <SkiaCanvas />
        {/* <MiniCanvas
          width={200}
          height={150}
          className="z-50 pointer-events-auto"
        /> */}
      </div>
      <LayerPanel />
    </div>
  );
}
