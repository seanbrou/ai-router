import { NextResponse } from "next/server";

export async function GET() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "NOT_SET";
  const url = new URL(convexUrl);
  return NextResponse.json({
    convexDeployment: url.hostname,
    env: process.env.NODE_ENV,
  });
}
