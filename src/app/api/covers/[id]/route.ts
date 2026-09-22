import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SIZES = new Set(["S", "M", "L"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const coverId = Number(id);
  if (!Number.isInteger(coverId) || coverId <= 0) {
    return new NextResponse("Invalid cover", { status: 400 });
  }

  const sizeParam = new URL(request.url).searchParams.get("size") ?? "S";
  const size = SIZES.has(sizeParam) ? sizeParam : "S";
  const source = `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;

  const upstream = await fetch(source, {
    next: { revalidate: 2592000 },
    headers: { Accept: "image/*" },
  });

  if (!upstream.ok) {
    return new NextResponse("Cover not found", { status: 404 });
  }

  const body = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=2592000, immutable",
    },
  });
}
