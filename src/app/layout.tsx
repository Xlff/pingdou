import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "拼豆图纸生成器",
  description: "上传图片，自动生成像素风格的拼豆图纸",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
