import { create } from 'zustand'
import type { Image as SkiaImage } from 'canvaskit-wasm'

// Mockup 在 localStorage 中的数据结构
interface MockupData {
  id: string
  main: string    // 图片路径
  depth: string
  mask: string
  segment: string
  pattern?: string
  // 可以添加其他元数据
  createdAt: number
  name: string
}

interface Mockup {
  id: string
  mainImage: SkiaImage | null
  depthMap: SkiaImage | null
  mask: SkiaImage | null
  segment: SkiaImage | null
  pattern?: SkiaImage | null
}

interface MockupStore {
  currentMockup: Mockup | null
  isLoading: boolean
  error: string | null

  setCurrentMockup: (mockup: Mockup) => void
  clearMockup: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // 新增方法
  saveMockupData: (imageId: string, paths: Partial<MockupData>) => void
  loadMockupById: (imageId: string, canvasKit: any) => Promise<void>
  getAllMockups: () => MockupData[]
}

const STORAGE_KEY = 'mockups'

export const useMockupStore = create<MockupStore>((set, get) => ({
  currentMockup: null,
  isLoading: false,
  error: null,

  setCurrentMockup: (mockup) => set({ currentMockup: mockup }),
  clearMockup: () => set({ currentMockup: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // 保存 mockup 数据到 localStorage
  saveMockupData: (imageId: string, paths: Partial<MockupData>) => {
    try {
      const mockupsStr = localStorage.getItem(STORAGE_KEY)
      const mockups: MockupData[] = mockupsStr ? JSON.parse(mockupsStr) : []
      
      const newMockup: MockupData = {
        id: imageId,
        main: paths.main || '',
        depth: paths.depth || '',
        mask: paths.mask || '',
        segment: paths.segment || '',
        pattern: paths.pattern,
        createdAt: Date.now(),
        name: paths.name || `Mockup ${imageId}`
      }

      // 如果已存在则更新，否则添加新的
      const existingIndex = mockups.findIndex(m => m.id === imageId)
      if (existingIndex >= 0) {
        mockups[existingIndex] = { ...mockups[existingIndex], ...newMockup }
      } else {
        mockups.push(newMockup)
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockups))
    } catch (error) {
      console.error('Failed to save mockup data:', error)
    }
  },

  // 从 localStorage 加载 mockup 数据并创建 SkiaImage
  loadMockupById: async (imageId: string, canvasKit) => {
    const store = get()
    store.setLoading(true)
    store.setError(null)

    try {
      const mockupsStr = localStorage.getItem(STORAGE_KEY)
      const mockups: MockupData[] = mockupsStr ? JSON.parse(mockupsStr) : []
      const mockupData = mockups.find(m => m.id === imageId)

      if (!mockupData) {
        throw new Error(`Mockup with id ${imageId} not found`)
      }

      // 辅助函数：加载图片并转换为 SkiaImage
      const loadImage = async (path: string): Promise<SkiaImage> => {
        const response = await fetch(path)
        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()
        const image = canvasKit.MakeImageFromEncoded(new Uint8Array(arrayBuffer))
        if (!image) {
          throw new Error(`Failed to load image: ${path}`)
        }
        return image
      }

      // 并行加载所有需要的图片
      const [mainImage, depthMap, mask, segment, pattern] = await Promise.all([
        loadImage(mockupData.main),
        loadImage(mockupData.depth),
        loadImage(mockupData.mask),
        loadImage(mockupData.segment),
        mockupData.pattern ? loadImage(mockupData.pattern) : Promise.resolve(null)
      ])

      const newMockup: Mockup = {
        id: imageId,
        mainImage,
        depthMap,
        mask,
        segment,
        pattern
      }

      store.setCurrentMockup(newMockup)
    } catch (error) {
      store.setError(error instanceof Error ? error.message : 'Failed to load mockup')
    } finally {
      store.setLoading(false)
    }
  },

  // 获取所有保存的 mockup 数据
  getAllMockups: () => {
    try {
      const mockupsStr = localStorage.getItem(STORAGE_KEY)
      return mockupsStr ? JSON.parse(mockupsStr) : []
    } catch (error) {
      console.error('Failed to get mockups:', error)
      return []
    }
  }
})) 