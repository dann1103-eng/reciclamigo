import "server-only";

import { cache } from "react";

import { planStatusFromRow, type PlanStatus } from "@/lib/domain/plans";
import { createClient } from "@/lib/supabase/server";

/** Plan del comercio con sesión y su uso del mes (plan_status()), memorizado por request. */
export const getPlanStatus = cache(async (): Promise<PlanStatus> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("plan_status");
  if (error) throw new Error(error.message);
  return planStatusFromRow(data?.[0]);
});
