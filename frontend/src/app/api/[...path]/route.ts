import { NextRequest, NextResponse } from 'next/server';

// ブラウザからの /api/* を全てバックエンドへ中継する Route Handler。
//
// なぜ next.config の rewrites ではなくこの方式か:
//   rewrites は「ビルド時」に転送先URLが固定されるため、Docker のサービス名
//   （http://backend:3001）を解決できず ECONNREFUSED になる。
//   Route Handler はリクエストごとにサーバー上で process.env を読むので、
//   ローカル（localhost:3001）と Docker 内（backend:3001）の両方で正しく動く。
// 副次効果として、バックエンドのURLやAPIキーがブラウザに一切露出しない。
const BACKEND = process.env.API_URL || 'http://localhost:3001';

async function proxy(req: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join('/');
  const search = req.nextUrl.search; // クエリ文字列（?lat=...&radius=...）をそのまま引き継ぐ
  const url = `${BACKEND}/${path}${search}`;

  const upstream = await fetch(url, {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
    body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
  });

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(req, params.path);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxy(req, params.path);
}
