import "server-only";

import { getServerEnv } from "./env";

export function getServerNow() {
  const fixedNow = getServerEnv().SGTA_E2E_NOW;
  return fixedNow === undefined ? new Date() : new Date(fixedNow);
}
