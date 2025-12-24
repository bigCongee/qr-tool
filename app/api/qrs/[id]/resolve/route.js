import { NextResponse } from "next/server";
import { readAllQrs } from "@/lib/storage";

export const dynamic = "force-dynamic";

function renderMessage(message, status = 400) {
  const html = `<!DOCTYPE html>
  <html lang="zh-CN">
    <head>
      <meta charset="utf-8" />
      <title>${message}</title>
      <style>
        body, html { margin: 0; padding: 0; height: 100%; background: #0b1220; color: #e5e7eb; }
        .wrap { display: flex; align-items: center; justify-content: center; height: 100%; text-align: center; }
        .msg { font-size: 24px; font-weight: 600; line-height: 1.6; padding: 26px 34px; border: 1px solid #1f2937; border-radius: 18px; background: rgba(17,24,39,0.92); box-shadow: 0 20px 50px rgba(0,0,0,0.45); }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="msg">${message}</div>
      </div>
    </body>
  </html>`;
  return new NextResponse(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function renderContent(content) {
  const escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const html = `<!DOCTYPE html>
  <html lang="zh-CN">
    <head>
      <meta charset="utf-8" />
      <title>二维码内容</title>
      <style>
        body, html { margin: 0; padding: 0; height: 100%; background: #0b1220; color: #e5e7eb; }
        .wrap { display: flex; align-items: center; justify-content: center; height: 100%; text-align: center; padding: 20px; }
        .msg { font-size: 18px; font-weight: 500; line-height: 1.6; padding: 24px 30px; border: 1px solid #1f2937; border-radius: 16px; background: rgba(17,24,39,0.9); box-shadow: 0 20px 50px rgba(0,0,0,0.45); max-width: 720px; word-break: break-word; white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="msg">${escaped}</div>
      </div>
    </body>
  </html>`;
  return new NextResponse(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function looksLikeUrl(value = "") {
  if (!value) return false;
  return /^https?:\/\//i.test(value.trim());
}

export async function GET(_request, { params }) {
  const list = await readAllQrs();
  const item = list.find((q) => q.id === params.id);
  if (!item) {
    return renderMessage("未找到二维码", 404);
  }
  if (item.expiresAt && new Date(item.expiresAt) < new Date()) {
    return renderMessage("二维码已过期", 410);
  }
  if (!item.content) {
    return renderMessage("二维码内容为空", 400);
  }
  // 若内容是 URL，跳转；否则直接展示文本内容
  if (looksLikeUrl(item.content)) {
    return NextResponse.redirect(item.content);
  }
  return new NextResponse(item.content, {
    status: 200,
  });
}
