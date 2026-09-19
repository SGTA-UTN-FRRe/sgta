import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import {
  createHourCategory,
  listHourCategories,
} from "@/features/hours/hour-service";
import {
  createHourCategoryInputSchema,
} from "@/features/hours/hour-validation";
import {
  getHourRequestContext,
  hourErrorResponse,
  hourJsonResponse,
  invalidHourRequestResponse,
  parseHourCategoryListQuery,
  parseHourJsonBody,
} from "@/features/hours/hour-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const parsedQuery = parseHourCategoryListQuery(request);

  if (!parsedQuery.success) {
    return invalidHourRequestResponse(parsedQuery.error);
  }

  try {
    const categories = await listHourCategories(
      getDatabase(),
      parsedQuery.data.status,
    );

    return hourJsonResponse({ categories });
  } catch (error) {
    return hourErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  const parsedBody = await parseHourJsonBody(
    request,
    createHourCategoryInputSchema,
  );

  if (!parsedBody.success) {
    return invalidHourRequestResponse(parsedBody.error);
  }

  try {
    const category = await createHourCategory(
      getDatabase(),
      parsedBody.data,
      getHourRequestContext(request, authorization.id),
    );

    return hourJsonResponse({ category }, 201);
  } catch (error) {
    return hourErrorResponse(error);
  }
}
