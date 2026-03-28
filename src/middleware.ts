import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AI_PROXY_RATE_LIMIT_DEFAULT_MAX,
  AI_PROXY_RATE_LIMIT_WINDOW_MS,
} from "@/lib/aiProxySecurity";

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const cf = req.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  return "unknown";
}

function allowRequest(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now - b.windowStart >= windowMs) {
    buckets.set(ip, { count: 1, windowStart: now });
    if (buckets.size > 8192) buckets.clear();
    return true;
  }
  if (b.count >= max) return false;
  b.count += 1;
  return true;
}

export function middleware(req: NextRequest) {
  if (req.method !== "POST") return NextResponse.next();

  if (process.env.AI_RATE_LIMIT_DISABLED === "1") {
    return NextResponse.next();
  }

  const max = Math.max(
    1,
    Math.min(
      500,
      Number.parseInt(process.env.AI_RATE_LIMIT_MAX_PER_WINDOW ?? "", 10) ||
        AI_PROXY_RATE_LIMIT_DEFAULT_MAX
    )
  );
  const windowMs = Math.max(
    10_000,
    Number.parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS ?? "", 10) || AI_PROXY_RATE_LIMIT_WINDOW_MS
  );

  const ip = clientIp(req);
  if (!allowRequest(ip, max, windowMs)) {
    return NextResponse.json(
      { error: "Too many AI requests from this network. Try again in a minute." },
      { status: 429 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/ai",
};
