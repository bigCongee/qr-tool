import { NextResponse } from "next/server";
import { readAllQrs, saveAllQrs } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const list = await readAllQrs();
  const item = list.find((q) => q.id === params.id && q.type === "dynamic");
  if (!item) return NextResponse.json({ error: "未找到" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(item, { status: 200, headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request, { params }) {
  const list = await readAllQrs();
  const idx = list.findIndex((q) => q.id === params.id && q.type === "dynamic");
  if (idx === -1) return NextResponse.json({ error: "未找到" }, { status: 404 });

  const body = await request.json();
  const now = new Date().toISOString();
  const current = list[idx];
  const updated = {
    ...current,
    name: body.name ?? current.name,
    type: "dynamic",
    content: body.content ?? current.content,
    expiresAt: body.expiresAt === undefined ? current.expiresAt : body.expiresAt,
    colorDark: body.colorDark || current.colorDark,
    colorLight: body.colorLight || current.colorLight,
    size: body.size || current.size,
    logoDataUrl: body.logoDataUrl ?? current.logoDataUrl,
    logoSizePercent: body.logoSizePercent ?? current.logoSizePercent ?? 20,
    logoRadius: body.logoRadius ?? current.logoRadius ?? 12,
    updatedAt: now,
  };

  if (!updated.content) {
    return NextResponse.json({ error: "内容必填" }, { status: 400 });
  }

  list[idx] = updated;
  await saveAllQrs(list);
  return NextResponse.json(updated);
}

export async function DELETE(_request, { params }) {
  const list = await readAllQrs();
  const idx = list.findIndex((q) => q.id === params.id && q.type === "dynamic");
  if (idx === -1) return NextResponse.json({ error: "未找到" }, { status: 404 });
  list.splice(idx, 1);
  await saveAllQrs(list);
  return NextResponse.json({ ok: true });
}
