export interface RouteConfig {
  path: string
  label: string
  icon?: string
  children?: RouteConfig[]
}

export const routes: RouteConfig[] = [
  {
    path: '/',
    label: '首页',
  },
  {
    path: '/magick',
    label: '图像处理',
  },
  {
    path: '/chat',
    label: 'AI 对话',
  },
  {
    path: '/skia',
    label: 'Skia 演示',
  },
]

// 扁平化路由配置，用于快速查找
export const flattenRoutes = (routes: RouteConfig[]): RouteConfig[] => {
  return routes.reduce<RouteConfig[]>((acc, route) => {
    acc.push(route)
    if (route.children) {
      acc.push(...flattenRoutes(route.children))
    }
    return acc
  }, [])
}

// 获取所有路由路径
export const getAllPaths = () => {
  return flattenRoutes(routes).map(route => route.path)
} 