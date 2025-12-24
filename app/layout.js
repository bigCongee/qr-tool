import "antd/dist/reset.css";
import "./globals.css";
import Link from "next/link";
import Providers from "./providers";

export const metadata = {
  title: "二维码管理工具",
  description: "生成、管理二维码的无数据库文件存储工具",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <header className="topbar">
            <div className="brand">二维码工具</div>
            <nav className="nav">
              <Link href="/">生成器</Link>
              <Link href="/admin">管理员</Link>
            </nav>
          </header>
          <main className="page">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
