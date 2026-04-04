import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

type PlanTier = "unpaid" | "basic" | "standard" | "premium";

const isValidPlan = (value: unknown): value is PlanTier => {
  return value === "unpaid" || value === "basic" || value === "standard" || value === "premium";
};

const readJsonBody = (req: VercelRequest) => {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body as Record<string, unknown>;
};

const getEnv = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return { error: "Missing required Supabase environment variables" };
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
  };
};

const forbidden = (res: VercelResponse) =>
  res.status(403).json({ error: "Forbidden. Admin access required." });

const noCache = (res: VercelResponse) => {
  res.setHeader("Cache-Control", "no-store");
};

const toIsoOrNull = (value: unknown) => {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const effectivePlan = (plan: PlanTier, expiresAt: string | null) => {
  if (!expiresAt) return plan;
  const expired = Date.now() > new Date(expiresAt).getTime();
  return expired ? "unpaid" : plan;
};

const buildCustomerMetadata = (
  existingMetadata: Record<string, unknown> | undefined,
  input: {
    fullName?: string | null;
    plan: PlanTier;
    expiresAt: string | null;
    canSelfManagePlan?: boolean;
  },
) => {
  return {
    ...(existingMetadata || {}),
    full_name: input.fullName ?? (existingMetadata?.full_name as string | null | undefined) ?? null,
    role: "customer",
    plan: input.plan,
    can_self_manage_plan: Boolean(input.canSelfManagePlan),
    is_testing_account: false,
    subscription_expires_at: input.expiresAt,
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const env = getEnv();
  if ("error" in env) {
    return res.status(500).json({ error: env.error });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return forbidden(res);
  }

  const userClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const {
    data: { user: requester },
    error: requesterError,
  } = await userClient.auth.getUser();

  if (requesterError || !requester || requester.user_metadata?.role !== "admin") {
    return forbidden(res);
  }

  const adminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

  if (req.method === "GET") {
    noCache(res);

    const { data, error } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const users = (data.users || []).map((user) => {
      const userPlan = isValidPlan(user.user_metadata?.plan) ? user.user_metadata.plan : "unpaid";

      return {
        id: user.id,
        email: user.email || "",
        fullName: (user.user_metadata?.full_name as string | undefined) || null,
        role: user.user_metadata?.role === "admin" ? "admin" : "customer",
        plan: userPlan,
        canSelfManagePlan: Boolean(user.user_metadata?.can_self_manage_plan),
        isTestingAccount: Boolean(user.user_metadata?.is_testing_account),
        subscriptionExpiresAt: (user.user_metadata?.subscription_expires_at as string | undefined) || null,
        createdAt: user.created_at,
      };
    });

    return res.status(200).json({ users });
  }

  const body = readJsonBody(req);
  const action = body.action;

  if (action === "create") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const fullName = String(body.fullName || "").trim() || null;
    const plan = body.plan;
    const expiresAt = toIsoOrNull(body.expiresAt);
    const canSelfManagePlan = Boolean(body.canSelfManagePlan);

    if (!email || !password || !isValidPlan(plan) || plan === "unpaid") {
      return res.status(400).json({ error: "Invalid create payload" });
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "customer",
        plan,
        can_self_manage_plan: canSelfManagePlan,
        is_testing_account: false,
        subscription_expires_at: expiresAt,
      },
    });

    if (error || !data.user) {
      return res.status(400).json({ error: error?.message || "Cannot create user" });
    }

    const dbPlan = effectivePlan(plan, expiresAt);
    await adminClient
      .from("profiles")
      .update({
        full_name: fullName,
        plan: dbPlan,
      })
      .eq("id", data.user.id);

    return res.status(200).json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  }

  if (action === "assignPlan") {
    const userId = String(body.userId || "").trim();
    const plan = body.plan;
    const expiresAt = toIsoOrNull(body.expiresAt);
    const fullName = String(body.fullName || "").trim() || null;
    const canSelfManagePlan = Boolean(body.canSelfManagePlan);

    if (!userId || !isValidPlan(plan)) {
      return res.status(400).json({ error: "Invalid assignPlan payload" });
    }

    const { data: existing, error: getError } = await adminClient.auth.admin.getUserById(userId);
    if (getError || !existing.user) {
      return res.status(404).json({ error: getError?.message || "User not found" });
    }

    if (existing.user.user_metadata?.role === "admin") {
      return res.status(400).json({ error: "Cannot modify admin account" });
    }

    const nextMetadata = buildCustomerMetadata(existing.user.user_metadata as Record<string, unknown> | undefined, {
      fullName,
      plan,
      expiresAt,
      canSelfManagePlan,
    });

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: nextMetadata,
    });

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    const dbPlan = effectivePlan(plan, expiresAt);
    await adminClient
      .from("profiles")
      .update({
        full_name: fullName,
        plan: dbPlan,
      })
      .eq("id", userId);

    return res.status(200).json({ success: true });
  }

  if (action === "delete") {
    const userId = String(body.userId || "").trim();
    if (!userId) {
      return res.status(400).json({ error: "Invalid delete payload" });
    }

    const { data: existing, error: getError } = await adminClient.auth.admin.getUserById(userId);
    if (getError || !existing.user) {
      return res.status(404).json({ error: getError?.message || "User not found" });
    }

    if (existing.user.user_metadata?.role === "admin") {
      return res.status(400).json({ error: "Cannot delete admin account" });
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return res.status(400).json({ error: deleteError.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: "Unknown action" });
}
