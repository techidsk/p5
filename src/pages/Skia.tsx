import { SkiaCanvas } from "../components/SkiaCanvas";
import { LayerPanel } from "../components/LayerPanel";
import { MiniCanvas } from "../components/MiniCanvas";
import { useEffect } from "react";
import { useCanvasKitStore } from "../store/canvasKitStore";

export default function SkiaPage() {
  const projectId = "project-1"; // 可以从路由或其他地方获取

  useEffect(() => {
    // 创建项目
    useCanvasKitStore.getState().createProject(
      projectId,
      "My Project",
      window.innerWidth,
      window.innerHeight
    );
  }, [projectId]);

  return (
    <div className="p-8 relative flex">
      <div className="flex-1 relative">
        <SkiaCanvas
          projectId={projectId}
          surfaceId={`main-canvas-${projectId}`}
          width={window.innerWidth}
          height={window.innerHeight}
        />
        <MiniCanvas
          projectId={projectId}
          width={200}
          height={150}
          className="z-50 pointer-events-auto"
        />
      </div>
      <LayerPanel projectId={projectId} />
    </div>
  );
}
