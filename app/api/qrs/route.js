import crypto from "crypto";
import { NextResponse } from "next/server";
import { readAllQrs, saveAllQrs } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const list = await readAllQrs();
  return NextResponse.json(list.filter((item) => item.type === "dynamic"), {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  const body = await request.json();
  if (body.type !== "dynamic") {
    return NextResponse.json({ error: "静态二维码不入库，请直接下载使用" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const entry = {
    id: crypto.randomUUID(),
    name: (body.name || "未命名").trim(),
    type: "dynamic",
    content: body.content || "",
    expiresAt: body.expiresAt || null,
    colorDark: body.colorDark || "#0f172a",
    colorLight: body.colorLight || "#ffffff",
    size: body.size || 320,
    logoDataUrl: body.logoDataUrl || "",
    logoSizePercent: body.logoSizePercent ?? 20,
    logoRadius: body.logoRadius ?? 12,
    createdAt: now,
    updatedAt: now,
  };

  if (!entry.content) {
    return NextResponse.json({ error: "内容必填" }, { status: 400 });
  }

  const list = await readAllQrs();
  list.unshift(entry);
  await saveAllQrs(list);
  return NextResponse.json(entry, { status: 201 });
}
