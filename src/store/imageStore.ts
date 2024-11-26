/**
 * @file imageStore.ts
 * @description 图片编辑器的状态管理存储，使用 Zustand 管理画布上的图片状态、
 * 选中状态和拖拽操作。集成了 immer 用于简化状态更新，使用 persist 实现状态持久化。
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { CanvasKit, Image, Surface } from "canvaskit-wasm";

/**
 * 表示画布上的单个图片对象
 * @interface ImageObject
 * @property {string} id - 唯一标识符
 * @property {Image} image - CanvasKit 图片实例
 * @property {string} name - 图片名称
 * @property {number} x - X 坐标位置
 * @property {number} y - Y 坐标位置
 * @property {number} scale - 缩放比例
 * @property {number} rotation - 旋转角度
 * @property {string} [blendMode] - 可选的混合模式
 * @property {number} [opacity] - 可选的透明度
 */
export interface ImageObject {
  id: string;
  image: Image;
  name: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  blendMode?: string;
  opacity?: number;
}

/**
 * 拖拽状态接口
 * @interface DragState
 * @property {boolean} isDragging - 是否正在拖拽
 * @property {number} startX - 拖拽起始 X 坐标
 * @property {number} startY - 拖拽起始 Y 坐标
 * @property {number} offsetX - X 轴偏移量
 * @property {number} offsetY - Y 轴偏移量
 */
interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

/**
 * 位移贴图状态接口
 * @interface DisplacementState
 * @property {string | null} sourceId - 源图片 ID
 * @property {Image | null} dispImage - 位移贴图图片实例
 * @property {Image | null} maskImage - 遮罩图片实例
 */
interface DisplacementState {
  sourceId: string | null;
  dispImage: Image | null;
  maskImage: Image | null;
}

/**
 * 图片存储的状态和操作接口
 * @interface ImageStore
 */
interface ImageStore {
  /** 存储所有图片对象的数组 */
  images: ImageObject[];
  /** 当前选中的图片对象 */
  selectedImage: ImageObject | null;
  /** 当前拖拽状态 */
  dragState: DragState;
  /** 位移贴图状态 */
  displacementState: DisplacementState;

  // Actions
  /** 添加新图片到画布 */
  addImage: (image: Image, name: string) => void;
  /** 选择指定 ID 的图片 */
  selectImage: (id: string) => void;
  /** 删除指定 ID 的图片 */
  deleteImage: (id: string) => void;
  /** 更新指定图片的属性 */
  updateImageContent: (id: string, updates: Partial<ImageObject>) => void;
  /** 创建派生图片 */
  createDerivedImage: (image: Image, name: string) => void;

  // Drag operations
  /** 处理图片点击事件，返回是否点击到图片 */
  handleImageClick: (x: number, y: number, rect: DOMRect) => boolean;
  /** 开始拖拽操作 */
  startDragging: (x: number, y: number, rect: DOMRect) => void;
  /** 处理拖拽过程 */
  handleDrag: (x: number, y: number, rect: DOMRect) => void;
  /** 停止拖拽 */
  stopDragging: () => void;
  /** 清除选中状态 */
  clearSelection: () => void;

  // Displacement operations
  /** 开始位移贴图 */
  startDisplacement: (sourceId: string, dispImage: Image) => void;
  /** 设置遮罩图片 */
  setDisplacementMask: (maskImage: Image) => void;
  /** 应用位移贴图 */
  applyDisplacement: (canvasKit: CanvasKit, surface: Surface) => void;
  /** 取消位移贴图 */
  cancelDisplacement: () => void;
}

/**
 * 创建图片存储实例
 * 使用 persist 中间件实现状态持久化
 * 使用 immer 中间件简化状态更新
 */
export const useImageStore = create<ImageStore>()(
  persist(
    immer((set, get) => ({
      images: [],
      selectedImage: null,
      dragState: {
        isDragging: false,
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0,
      },
      displacementState: {
        sourceId: null,
        dispImage: null,
        maskImage: null,
      },

      addImage: (image, name) => {
        set((state) => {
          const newImage = {
            id: crypto.randomUUID(),
            image,
            name,
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            opacity: 1,
          };
          state.images.push(newImage);
          state.selectedImage = newImage;
        });
      },

      selectImage: (id) => {
        set((state) => {
          state.selectedImage =
            state.images.find((img) => img.id === id) || null;
        });
      },

      deleteImage: (id) => {
        set((state) => {
          state.images = state.images.filter((img) => img.id !== id);
          if (state.selectedImage?.id === id) {
            state.selectedImage = null;
          }
        });
      },

      updateImageContent: (id, updates) => {
        set((state) => {
          const image = state.images.find((img) => img.id === id);
          if (image) {
            Object.assign(image, updates);
            if (state.selectedImage?.id === id) {
              state.selectedImage = image;
            }
          }
        });
      },

      createDerivedImage: (image, name) => {
        set((state) => {
          state.images.push({
            id: crypto.randomUUID(),
            image,
            name,
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
          });
        });
      },

      handleImageClick: (x, y, rect) => {
        const state = get();
        // 从后往前检查，以处理层叠顺序
        for (let i = state.images.length - 1; i >= 0; i--) {
          const img = state.images[i];
          // 简单的碰撞检测逻辑
          const relativeX = x - rect.left - img.x;
          const relativeY = y - rect.top - img.y;
          if (
            relativeX >= 0 &&
            relativeX <= img.image.width() * img.scale &&
            relativeY >= 0 &&
            relativeY <= img.image.height() * img.scale
          ) {
            set((state) => {
              state.selectedImage = img;
            });
            return true;
          }
        }
        return false;
      },

      startDragging: (x, y, rect) => {
        const state = get();
        if (state.selectedImage) {
          set((state) => {
            state.dragState = {
              isDragging: true,
              startX: x - rect.left,
              startY: y - rect.top,
              offsetX: state.selectedImage!.x,
              offsetY: state.selectedImage!.y,
            };
          });
        }
      },

      handleDrag: (x, y, rect) => {
        const state = get();
        if (state.dragState.isDragging && state.selectedImage) {
          set((state) => {
            const deltaX = x - rect.left - state.dragState.startX;
            const deltaY = y - rect.top - state.dragState.startY;
            const imageIndex = state.images.findIndex(
              (img) => img.id === state.selectedImage!.id
            );
            if (imageIndex !== -1) {
              state.images[imageIndex].x = state.dragState.offsetX + deltaX;
              state.images[imageIndex].y = state.dragState.offsetY + deltaY;
              state.selectedImage = state.images[imageIndex];
            }
          });
        }
      },

      stopDragging: () => {
        set((state) => {
          state.dragState.isDragging = false;
        });
      },

      clearSelection: () => {
        set((state) => {
          state.selectedImage = null;
        });
      },

      startDisplacement: (sourceId, dispImage) => {
        set((state) => {
          // 添加位移贴图作为临时图层
          state.addImage(dispImage, "displacement-map-temp", {
            blendMode: "normal",
            opacity: 1,
          });

          state.displacementState = {
            sourceId,
            dispImage,
            maskImage: null,
          };
        });
      },

      setDisplacementMask: (maskImage) => {
        set((state) => {
          state.displacementState.maskImage = maskImage;
        });
      },

      applyDisplacement: (canvasKit, surface) => {
        const state = get();
        const { sourceId, dispImage, maskImage } = state.displacementState;

        if (!sourceId || !dispImage) return;

        const sourceImage = state.images.find((img) => img.id === sourceId);
        if (!sourceImage) return;

        // 找到临时的位移贴图图层
        const dispLayer = state.images.find((img) => img.image === dispImage);
        if (!dispLayer) return;

        const tempSurface = canvasKit.MakeSurface(
          sourceImage.image.width(),
          sourceImage.image.height()
        );

        if (tempSurface) {
          // 应用位移效果
          applyDisplacement(canvasKit, tempSurface, {
            sourceImage: sourceImage.image,
            displacementMap: dispImage,
            maskImage: maskImage || undefined,
            strength: 50,
            // 可以从位移贴图图层获取位置信息
            sourceX: dispLayer.x,
            sourceY: dispLayer.y,
          });

          const snapshot = tempSurface.makeImageSnapshot();
          state.createDerivedImage(snapshot, "置换效果");

          // 清理
          tempSurface.delete();
          state.deleteImage(dispLayer.id);
          state.displacementState = {
            sourceId: null,
            dispImage: null,
            maskImage: null,
          };
        }
      },

      cancelDisplacement: () => {
        const state = get();
        const { dispImage } = state.displacementState;

        if (dispImage) {
          // 找到并删除临时的位移贴图图层
          const dispLayer = state.images.find((img) => img.image === dispImage);
          if (dispLayer) {
            state.deleteImage(dispLayer.id);
          }
        }

        set((state) => {
          state.displacementState = {
            sourceId: null,
            dispImage: null,
            maskImage: null,
          };
        });
      },
    })),
    {
      name: "image-storage",
      /**
       * 状态持久化时的部分存储配置
       * 只保存必要的状态信息，排除不可序列化的 Image 对象
       */
      partialize: (state) => ({
        images: state.images.map(
          ({ id, name, x, y, scale, rotation, blendMode }) => ({
            id,
            name,
            x,
            y,
            scale,
            rotation,
            blendMode,
          })
        ),
      }),
    }
  )
);
