import "server-only";

import { isIP } from "node:net";

import { isSafeAuditRequestId } from "./audit-validation";

export type AuditRequestContext = {
  requestId?: string;
  ipAddress?: string;
};

function getHeader(request: Request, name: string, maxLength: number) {
  const value = request.headers.get(name)?.trim();
  return value !== undefined && value.length > 0 && value.length <= maxLength
    ? value
    : undefined;
}

export function getAuditRequestContext(request: Request): AuditRequestContext {
  const suppliedRequestId = getHeader(request, "x-request-id", 255);
  const forwardedAddress = request.headers
    .get("x-forwarded-for")
    ?.split(",", 1)[0]
    ?.trim();
  const realAddress = getHeader(request, "x-real-ip", 45);
  const ipAddress = [forwardedAddress, realAddress].find(
    (candidate) =>
      candidate !== undefined && candidate.length <= 45 && isIP(candidate) !== 0,
  );

  return {
    ...(isSafeAuditRequestId(suppliedRequestId)
      ? { requestId: suppliedRequestId.trim() }
      : {}),
    ...(ipAddress === undefined ? {} : { ipAddress }),
  };
}
