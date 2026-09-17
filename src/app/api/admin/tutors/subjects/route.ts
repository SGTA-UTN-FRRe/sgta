import { requireApiRole } from "@/auth/authorization";
import { getDatabase } from "@/db/client";
import { listSubjectCoverage } from "@/features/tutors/tutor-service";
import {
  tutorErrorResponse,
  tutorJsonResponse,
} from "@/features/tutors/tutor-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await requireApiRole("ADMIN");

  if (authorization instanceof Response) {
    return authorization;
  }

  try {
    const coverage = await listSubjectCoverage(getDatabase());

    return tutorJsonResponse({ coverage });
  } catch (error) {
    return tutorErrorResponse(error);
  }
}
