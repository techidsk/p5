export default function HomePage() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">图像处理演示</h1>
      <div className="prose max-w-none">
        <p>这是一个使用 React 构建的图像处理演示应用。</p>
        <h2 className="text-xl font-bold mt-6 mb-3">功能列表：</h2>
        <ul className="list-disc pl-6">
          <li>
            <strong>Magick 页面</strong>：使用 ImageMagick 进行图像处理和合成
          </li>
          <li>
            <strong>Skia 页面</strong>：使用 Skia 进行图形渲染
          </li>
          <li>
            <strong>AI 对话</strong>：与 AI 助手进行对话
          </li>
        </ul>
      </div>
    </div>
  )
} 