import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  setHourCategoryStatus,
} from "@/features/hours/hour-service";
import { hourCategoryStatusTransitionSchema } from "@/features/hours/hour-validation";
import {
  getHourRequestContext,
  hourErrorResponse,
  hourJsonResponse,
  invalidHourRequestResponse,
  parseHourJsonBody,
  parseHourPathId,
} from "@/features/hours/hour-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HourCategoryStatusRouteContext = {
  params: Promise<{ categoryId: string }>;
};

export async function PATCH(
  request: Request,
  context: HourCategoryStatusRouteContext,
) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const { categoryId } = await context.params;
  const parsedCategoryId = parseHourPathId(categoryId);

  if (!parsedCategoryId.success) {
    return invalidHourRequestResponse();
  }

  const parsedBody = await parseHourJsonBody(
    request,
    hourCategoryStatusTransitionSchema,
  );

  if (!parsedBody.success) {
    return invalidHourRequestResponse(parsedBody.error);
  }

  try {
    const category = await setHourCategoryStatus(
      getDatabase(),
      parsedCategoryId.data,
      parsedBody.data,
      getHourRequestContext(request, authorization.id),
    );

    return hourJsonResponse({ category });
  } catch (error) {
    return hourErrorResponse(error);
  }
}
