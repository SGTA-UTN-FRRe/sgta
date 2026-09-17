import { z } from "zod";

import {
  CYCLE_ERROR_CODES,
  CycleServiceError,
} from "./cycle-service";

export function cycleErrorResponse(error: unknown) {
  if (error instanceof z.ZodError) {
    return Response.json(
      { error: "invalid_request" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (error instanceof CycleServiceError) {
    const status =
      error.code === CYCLE_ERROR_CODES.cycleNotFound
        ? 404
        : error.code === CYCLE_ERROR_CODES.openCycleExists ||
            error.code === CYCLE_ERROR_CODES.cycleAlreadyClosed
          ? 409
          : 400;

    return Response.json(
      { error: error.code },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { error: "internal_server_error" },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export function invalidCycleRequestResponse() {
  return Response.json(
    { error: "invalid_request" },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}
