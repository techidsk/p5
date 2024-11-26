import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import type { CanvasKit, Surface } from "canvaskit-wasm";

// 启用 MapSet 支持
enableMapSet();

// 在 store 外部存储 CanvasKit 实例和 surfaces
const instances = {
  canvasKit: null as CanvasKit | null,
  surfaces: new Map<string, Surface>(),
  activeSurfaceId: null as string | null,
};

interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

interface CanvasKitStore {
  // 状态
  activeSurfaceId: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  transform: CanvasTransform;
  isPanning: boolean;
  lastPanPosition: { x: number; y: number };

  // Actions
  initialize: (canvasKit: CanvasKit) => void;
  createSurface: (id: string, width: number, height: number) => Surface | null;
  deleteSurface: (id: string) => void;
  setActiveSurface: (id: string) => void;
  cleanup: () => void;
  resizeSurface: (id: string) => void;
  getActiveSurface: () => Surface | null;
  getCanvasKit: () => CanvasKit | null;
  updateTransform: (transform: Partial<CanvasTransform>) => void;
  startPanning: (x: number, y: number) => void;
  updatePanning: (x: number, y: number) => void;
  stopPanning: () => void;
  handleWheel: (deltaY: number) => void;
}

export const useCanvasKitStore = create<CanvasKitStore>()(
  immer<CanvasKitStore>((set, get) => ({
    // 初始状态
    activeSurfaceId: null,
    isInitialized: false,
    isLoading: false,
    error: null,
    transform: { x: 0, y: 0, scale: 1 },
    isPanning: false,
    lastPanPosition: { x: 0, y: 0 },

    // 初始化 CanvasKit
    initialize: (canvasKit: CanvasKit) => {
      console.log("Initializing CanvasKit");
      instances.canvasKit = canvasKit;
      set((state) => {
        state.isInitialized = true;
        state.isLoading = false;
        state.error = null;
      });
    },

    // 创建新的 Surface
    createSurface: (id: string, width: number, height: number) => {
      if (!instances.canvasKit) {
        console.error("CanvasKit not initialized");
        set((state) => {
          state.error = new Error("CanvasKit not initialized");
        });
        return null;
      }

      try {
        const canvas = document.getElementById(id) as HTMLCanvasElement;
        if (!canvas) {
          throw new Error(`Canvas element with id ${id} not found`);
        }

        // 清理已存在的 surface
        const existingSurface = instances.surfaces.get(id);
        if (existingSurface) {
          existingSurface.delete();
        }

        // 设置画布尺寸
        canvas.width = width;
        canvas.height = height;

        const surface = instances.canvasKit.MakeWebGLCanvasSurface(canvas);
        if (!surface) {
          throw new Error("Failed to create surface");
        }

        instances.surfaces.set(id, surface);
        set((state) => {
          if (!state.activeSurfaceId) {
            state.activeSurfaceId = id;
          }
        });
        instances.activeSurfaceId = id;
        return surface;
      } catch (error) {
        console.error("Error creating surface:", error);
        set((state) => {
          state.error = error as Error;
        });
        return null;
      }
    },

    // 删除指定的 Surface
    deleteSurface: (id: string) => {
      const surface = instances.surfaces.get(id);

      if (surface) {
        surface.delete();
        instances.surfaces.delete(id);
        if (instances.activeSurfaceId === id) {
          instances.activeSurfaceId =
            instances.surfaces.size > 0
              ? Array.from(instances.surfaces.keys())[0]
              : null;
        }
      }
    },

    // 设置活动 Surface
    setActiveSurface: (id: string) => {
      if (instances.surfaces.has(id)) {
        instances.activeSurfaceId = id;
      }
    },

    // 清理所有资源
    cleanup: () => {
      console.log("Cleaning up");
      // 清理所有 surfaces
      instances.surfaces.forEach((surface) => {
        surface.delete();
      });

      instances.surfaces.clear();
      instances.activeSurfaceId = null;
      instances.canvasKit = null;
    },

    // 调整 Surface 大小
    resizeSurface: (id: string) => {
      const surface = instances.surfaces.get(id);

      if (surface && instances.canvasKit) {
        surface.delete();
        const newSurface = instances.canvasKit.MakeWebGLCanvasSurface(id);
        if (newSurface) {
          instances.surfaces.set(id, newSurface);
        }
      }
    },

    // 获取当前活动的 Surface
    getActiveSurface: () => {
      if (!instances.activeSurfaceId) {
        console.error("No active surface");
        return null;
      }
      return instances.surfaces.get(instances.activeSurfaceId) || null;
    },

    // 获取 CanvasKit 实例
    getCanvasKit: () => {
      return instances.canvasKit;
    },

    // 新增 actions
    updateTransform: (newTransform) => {
      set(state => {
        Object.assign(state.transform, newTransform);
      });
    },

    startPanning: (x, y) => {
      set(state => {
        state.isPanning = true;
        state.lastPanPosition = { x, y };
      });
    },

    updatePanning: (x, y) => {
      set(state => {
        if (state.isPanning) {
          const dx = x - state.lastPanPosition.x;
          const dy = y - state.lastPanPosition.y;
          state.transform.x += dx;
          state.transform.y += dy;
          state.lastPanPosition = { x, y };
        }
      });
    },

    stopPanning: () => {
      set(state => {
        state.isPanning = false;
      });
    },

    handleWheel: (deltaY) => {
      set(state => {
        state.transform.y -= deltaY;
      });
    },
  }))
);
