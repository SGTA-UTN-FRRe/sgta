import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getHandlers() {
  return toNextJsHandler(getAuth());
}

export function GET(request: Request) {
  return getHandlers().GET(request);
}

export function POST(request: Request) {
  return getHandlers().POST(request);
}

export function PATCH(request: Request) {
  return getHandlers().PATCH(request);
}

export function PUT(request: Request) {
  return getHandlers().PUT(request);
}

export function DELETE(request: Request) {
  return getHandlers().DELETE(request);
}
