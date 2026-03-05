import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // 生成纯静态文件，可部署到任何 Web 服务器
  trailingSlash: true, // 确保 index.html 路由兼容 Nginx
  images: {
    unoptimized: true, // 静态导出不支持 Next.js 图片优化
  },
};

export default nextConfig;
