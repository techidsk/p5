/**
 * @file imageStore.ts
 * @description 图片编辑器的状态管理存储，使用 Zustand 管理画布上的图片状态、
 * 选中状态和拖拽操作。集成了 immer 用于简化状态更新，使用 persist 实现状态持久化。
 */

import type { CanvasKit, Image, Surface } from "canvaskit-wasm";
import debounce from "lodash/debounce";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { applyDisplacement } from "../utils/displacement";
import { BlendModeName, ImageObject } from "../types/image";

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
  /** 处理拖拽���程 */
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

  // 新增的方法
  checkLayerOverlap: (x: number, y: number, rect: DOMRect) => void;
  onLayerOverlap?: (
    draggingLayer: ImageObject,
    targetLayer: ImageObject
  ) => void;
  setLayerOverlapHandler: (
    handler: (dragging: ImageObject, target: ImageObject) => void
  ) => void;

  // Add these two helper methods to the interface
  checkOverlap: (topImage: ImageObject, bottomImage: ImageObject) => boolean;
  checkSizeRatio: (
    img1: ImageObject,
    img2: ImageObject,
    threshold?: number
  ) => boolean;

  debouncedHandleOverlap: (dragging: ImageObject, target: ImageObject) => void;

  isOverlapping: boolean; // 添加重叠状态追踪
  onEnterOverlap?: (dragging: ImageObject, target: ImageObject) => void; // 进入重叠回调
  onDragInOverlap?: (dragging: ImageObject, target: ImageObject) => void; // 新增
  onLeaveOverlap?: (dragging: ImageObject) => void; // 离开重叠回调
  setOverlapHandlers: (
    onEnter: (dragging: ImageObject, target: ImageObject) => void,
    onDragIn: (dragging: ImageObject, target: ImageObject) => void, // 新增
    onLeave: (dragging: ImageObject) => void
  ) => void;

  clearAllImages: () => void;

  findTopImageAtPoint: (x: number, y: number) => ImageObject | undefined;

  canvasWidth: number;
  canvasHeight: number;
}

/**
 * 创建图片存储实例
 * 使用 persist 中间件实现状态持久化
 * 使用 immer 中间件简化状态更新
 */
export const useImageStore = create<ImageStore>()(
  persist(
    immer<ImageStore>((set, get) => ({
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
      canvasHeight: 0,
      canvasWidth: 0,

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
            blendMode: "SrcOver" as BlendModeName,
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
          // 更新 images 数组中的对象
          state.images = state.images.map((img) => {
            if (img.id === id) {
              console.log({
                id: img.id,
                blendMode: img.blendMode,
                updates,
              });
              const updatedImage = {
                ...img,
                ...updates,
              };
              // 同时更新 selectedImage
              if (state.selectedImage?.id === id) {
                state.selectedImage = updatedImage;
              }

              return updatedImage;
            }
            return img;
          });
        });
      },

      createDerivedImage: (image, name) => {
        set((state) => {
          console.log("create derived image", name);
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
        if (!state.dragState.isDragging || !state.selectedImage) {
          // console.log("no dragging or selected image");
          return;
        }

        // 计算新位置
        const newX =
          state.dragState.offsetX + (x - rect.left - state.dragState.startX);
        const newY =
          state.dragState.offsetY + (y - rect.top - state.dragState.startY);

        const updatedDraggingImage = {
          ...state.selectedImage,
          x: newX,
          y: newY,
        };

        let hasOverlap = false;
        let overlappingTarget = null;

        // 检查重叠
        for (let i = state.images.length - 1; i >= 0; i--) {
          const targetImage = state.images[i];
          if (targetImage.id === updatedDraggingImage.id) continue;

          if (
            state.checkOverlap(updatedDraggingImage, targetImage) &&
            state.checkSizeRatio(updatedDraggingImage, targetImage)
          ) {
            hasOverlap = true;
            overlappingTarget = targetImage;
            break;
          }
        }

        // 使用 immer 一次性更新所有状态
        set((state) => {
          // 直接更新选中图片的位置
          state.selectedImage!.x = newX;
          state.selectedImage!.y = newY;

          // 更新图层数组中的位置
          state.images = state.images.map((img) =>
            img.id === state.selectedImage?.id
              ? { ...img, x: newX, y: newY }
              : img
          );

          // 处理重叠状态
          if (hasOverlap && overlappingTarget) {
            if (!state.isOverlapping && state.onEnterOverlap) {
              state.onEnterOverlap(updatedDraggingImage, overlappingTarget);
            } else if (state.isOverlapping && state.onDragInOverlap) {
              state.onDragInOverlap(updatedDraggingImage, overlappingTarget);
            }
            state.isOverlapping = true;
          } else if (state.isOverlapping) {
            if (state.onLeaveOverlap) {
              state.onLeaveOverlap(updatedDraggingImage);
            }
            state.isOverlapping = false;
          }
        });
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
          state.addImage(dispImage, "displacement-map-temp");

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

      // 检查重叠的辅助函数
      checkOverlap: (draggingImage: ImageObject, targetImage: ImageObject) => {
        // // 添加调试日志
        // console.log('Checking overlap:', {
        //   dragging: {
        //     name: draggingImage.name,
        //     x: draggingImage.x,
        //     y: draggingImage.y,
        //     width: draggingImage.image.width(),
        //     height: draggingImage.image.height(),
        //     scale: draggingImage.scale
        //   },
        //   target: {
        //     name: targetImage.name,
        //     x: targetImage.x,
        //     y: targetImage.y,
        //     width: targetImage.image.width(),
        //     height: targetImage.image.height(),
        //     scale: targetImage.scale
        //   }
        // });

        // 计算拖动图像的中心点
        const dragCenterX =
          draggingImage.x +
          (draggingImage.image.width() * draggingImage.scale) / 2;
        const dragCenterY =
          draggingImage.y +
          (draggingImage.image.height() * draggingImage.scale) / 2;

        // 计算目标图像的边界
        const targetLeft = targetImage.x;
        const targetRight =
          targetImage.x + targetImage.image.width() * targetImage.scale;
        const targetTop = targetImage.y;
        const targetBottom =
          targetImage.y + targetImage.image.height() * targetImage.scale;

        // 检查中心点否在目标图像内
        const isOverlapping =
          dragCenterX >= targetLeft &&
          dragCenterX <= targetRight &&
          dragCenterY >= targetTop &&
          dragCenterY <= targetBottom;

        return isOverlapping;
      },

      // 检查尺寸比例
      checkSizeRatio: (
        draggingImage: ImageObject,
        targetImage: ImageObject
      ) => {
        // 计算图像面积
        const draggingArea =
          draggingImage.image.width() *
          draggingImage.image.height() *
          draggingImage.scale ** 2;
        const targetArea =
          targetImage.image.width() *
          targetImage.image.height() *
          targetImage.scale ** 2;

        // 检查拖动图像是否显著小于目标图像（例如小于70%）
        const ratio = draggingArea / targetArea;
        return ratio < 0.7;
      },

      // 设置重叠处理函数
      setLayerOverlapHandler: (handler) => {
        set({ onLayerOverlap: handler });
      },

      // 使用 lodash 的 debounce 实现
      debouncedHandleOverlap: debounce(
        (dragging: ImageObject, target: ImageObject) => {
          console.log("debouncedHandleOverlap", dragging, target);
          const state = get();
          if (state.onLayerOverlap) {
            state.onLayerOverlap(dragging, target);
          }
        },
        100
      ),

      checkLayerOverlap: (x: number, y: number, rect: DOMRect) => {
        const state = get();
        if (!state.selectedImage) return;

        // 从后往前遍历，找到第一个符合条件的图层
        for (let i = state.images.length - 1; i >= 0; i--) {
          const targetImage = state.images[i];
          if (targetImage.id === state.selectedImage.id) continue;

          const draggingImage = state.selectedImage;
          if (
            state.checkOverlap(draggingImage, targetImage) &&
            state.checkSizeRatio(draggingImage, targetImage)
          ) {
            // 如果之前不是重叠状态，触发进入重叠事件
            if (!state.isOverlapping && state.onEnterOverlap) {
              state.onEnterOverlap(draggingImage, targetImage);
            }
            set({ isOverlapping: true });
            return;
          }
        }

        // 如果之前是重叠状态，现在不重叠了，触发离开重叠事件
        if (state.isOverlapping && state.onLeaveOverlap) {
          state.onLeaveOverlap(state.selectedImage);
        }
        set({ isOverlapping: false });
      },

      isOverlapping: false,

      // 设置重叠处理函数
      setOverlapHandlers: (
        onEnter: (dragging: ImageObject, target: ImageObject) => void,
        onDragIn: (dragging: ImageObject, target: ImageObject) => void,
        onLeave: (dragging: ImageObject) => void
      ) => {
        set({
          onEnterOverlap: onEnter,
          onDragInOverlap: onDragIn,
          onLeaveOverlap: onLeave,
        });
      },

      clearAllImages: () => {
        set((state) => {
          state.images = [];
          state.selectedImage = null;
          state.isOverlapping = false;
          // Reset any other relevant state
          if (state.displacementState.dispImage) {
            state.displacementState = {
              sourceId: null,
              dispImage: null,
              maskImage: null,
            };
          }
        });
      },

      findTopImageAtPoint: (x: number, y: number): ImageObject | undefined => {
        const { images } = get();
        // 从后向前遍历，找到第一个命中的图像
        for (let i = images.length - 1; i >= 0; i--) {
          const img = images[i];
          if (!img.image) continue;

          const width = img.image.width() * (img.scale || 1);
          const height = img.image.height() * (img.scale || 1);

          if (
            x >= img.x &&
            x <= img.x + width &&
            y >= img.y &&
            y <= img.y + height
          ) {
            return img;
          }
        }
        return undefined;
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
        isOverlapping: false,
      }),
    }
  )
);
