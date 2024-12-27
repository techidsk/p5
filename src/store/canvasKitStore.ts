import { create } from "zustand";
import type { CanvasKit, Surface } from "canvaskit-wasm";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
// 启用 MapSet 支持
enableMapSet();

interface Project {
  id: string;
  name: string;
  canvasKit: CanvasKit | null;
  canvasWidth: number;
  canvasHeight: number;
  surfaces: Map<string, Surface>;
  transform: CanvasTransform;
  isPanning: boolean;
  lastPanPosition: { x: number; y: number };
}

interface CanvasTransform {
  x: number;
  y: number;
  scale: number;
}

interface CanvasKitStore {
  // CanvasKit 实例
  canvasKit: CanvasKit | null;
  // 项目管理
  projects: Map<string, Project>;
  activeProjectId: string | null;

  // 基础状态
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;

  // Actions
  initialize: (canvasKit: CanvasKit) => void;
  cleanup: () => void;

  // 项目相关操作
  createProject: (
    id: string,
    name: string,
    width: number,
    height: number
  ) => void;
  setActiveProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;

  // Surface 相关操作
  createSurface: (
    projectId: string,
    surfaceId: string,
    width: number,
    height: number
  ) => Surface | null;
  deleteSurface: (projectId: string, surfaceId: string) => void;
  getSurface: (projectId: string, surfaceId: string) => Surface | null;

  // Transform 相关操作
  getProjectTransform: (projectId: string) => CanvasTransform;
  updateProjectTransform: (
    projectId: string,
    transform: Partial<CanvasTransform>
  ) => void;

  // 工具方法
  getCanvasKit: () => CanvasKit | null;

  // 画布操作相关
  startPanning: (projectId: string, x: number, y: number) => void;
  updatePanning: (projectId: string, x: number, y: number) => void;
  stopPanning: (projectId: string) => void;
  handleWheel: (
    projectId: string,
    deltaY: number,
    isCtrlPressed: boolean,
    clientX: number,
    clientY: number
  ) => void;
  isPanning: (projectId: string) => boolean;
  getTransform: (projectId: string) => CanvasTransform;
}

export const useCanvasKitStore = create<CanvasKitStore>()(
  immer<CanvasKitStore>((set, get) => ({
    canvasKit: null,
    projects: new Map(),
    activeProjectId: null,
    isInitialized: false,
    isLoading: false,
    error: null,

    initialize: (canvasKit: CanvasKit) => {
      set((state) => {
        const project = state.projects.get(state.activeProjectId!);
        if (project) {
          project.canvasKit = canvasKit;
        }
        state.isInitialized = true;
      });
    },

    createSurface: (projectId, surfaceId, width, height) => {
      const project = get().projects.get(projectId);
      if (!project?.canvasKit) return null;

      try {
        const canvas = document.getElementById(surfaceId) as HTMLCanvasElement;
        if (!canvas) return null;

        const surface = project.canvasKit.MakeWebGLCanvasSurface(canvas);
        if (!surface) return null;

        set((state) => {
          const project = state.projects.get(projectId);
          if (project) {
            project.surfaces.set(surfaceId, surface);
          }
        });

        return surface;
      } catch (error) {
        console.error("Error creating surface:", error);
        return null;
      }
    },

    createProject: (id, name, width, height) => {
      set((state) => {
        state.projects.set(id, {
          id,
          name,
          canvasKit: null,
          canvasWidth: width,
          canvasHeight: height,
          surfaces: new Map(),
          transform: { x: 0, y: 0, scale: 1 },
          isPanning: false,
          lastPanPosition: { x: 0, y: 0 },
        });
        if (!state.activeProjectId) {
          state.activeProjectId = id;
        }
      });
    },

    cleanup: () => {
      const state = get();
      state.projects.forEach((project) => {
        project.surfaces.forEach((surface) => surface.delete());
      });
      set({ projects: new Map(), canvasKit: null, activeProjectId: null });
    },

    setActiveProject: (projectId) => set({ activeProjectId: projectId }),

    deleteProject: (projectId) => {
      const state = get();
      const project = state.projects.get(projectId);
      if (project) {
        project.surfaces.forEach((surface) => surface.delete());
        const newProjects = new Map(state.projects);
        newProjects.delete(projectId);
        set({ projects: newProjects });
      }
    },

    deleteSurface: (projectId, surfaceId) => {
      const state = get();
      const surface = state.projects.get(projectId)?.surfaces.get(surfaceId);
      if (surface) {
        surface.delete();
        const newProjects = new Map(state.projects);
        newProjects.get(projectId)?.surfaces.delete(surfaceId);
        set({ projects: newProjects });
      }
    },

    getSurface: (projectId, surfaceId) =>
      get().projects.get(projectId)?.surfaces.get(surfaceId) || null,

    getProjectTransform: (projectId) =>
      get().projects.get(projectId)?.transform || { x: 0, y: 0, scale: 1 },

    updateProjectTransform: (projectId, transform) => {
      const state = get();
      const project = state.projects.get(projectId);
      if (project) {
        const newProjects = new Map(state.projects);
        newProjects.set(projectId, {
          ...project,
          transform: { ...project.transform, ...transform },
        });
        set({ projects: newProjects });
      }
    },

    startPanning: (projectId, x, y) => {
      const state = get();
      const project = state.projects.get(projectId);
      if (project) {
        const newProjects = new Map(state.projects);
        newProjects.set(projectId, {
          ...project,
          isPanning: true,
          lastPanPosition: { x, y },
        });
        set({ projects: newProjects });
      }
    },

    updatePanning: (projectId, x, y) => {
      const state = get();
      const project = state.projects.get(projectId);
      if (project?.isPanning) {
        const dx = x - project.lastPanPosition.x;
        const dy = y - project.lastPanPosition.y;
        const newProjects = new Map(state.projects);
        newProjects.set(projectId, {
          ...project,
          transform: {
            ...project.transform,
            x: project.transform.x + dx,
            y: project.transform.y + dy,
          },
          lastPanPosition: { x, y },
        });
        set({ projects: newProjects });
      }
    },

    stopPanning: (projectId) => {
      const state = get();
      const project = state.projects.get(projectId);
      if (project) {
        const newProjects = new Map(state.projects);
        newProjects.set(projectId, { ...project, isPanning: false });
        set({ projects: newProjects });
      }
    },

    handleWheel: (projectId, deltaY, isCtrlPressed, clientX, clientY) => {
      const state = get();
      const project = state.projects.get(projectId);
      if (!project) return;

      const newProjects = new Map(state.projects);
      const transform = { ...project.transform };

      if (isCtrlPressed) {
        const scaleFactor = 1 - deltaY * 0.001;
        const oldScale = transform.scale;
        transform.scale = Math.max(0.1, Math.min(10, oldScale * scaleFactor));
        const mouseX = clientX - transform.x;
        const mouseY = clientY - transform.y;
        transform.x += mouseX - (mouseX * transform.scale) / oldScale;
        transform.y += mouseY - (mouseY * transform.scale) / oldScale;
      } else {
        transform.y -= deltaY;
      }

      newProjects.set(projectId, { ...project, transform });
      set({ projects: newProjects });
    },

    isPanning: (projectId) => get().projects.get(projectId)?.isPanning || false,

    getTransform: (projectId) =>
      get().projects.get(projectId)?.transform || { x: 0, y: 0, scale: 1 },

    getCanvasKit: () => get().canvasKit,
  }))
);
