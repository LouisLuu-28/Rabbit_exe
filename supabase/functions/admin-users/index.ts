import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type PlanTier = "unpaid" | "basic" | "standard" | "premium";

const isValidPlan = (v: unknown): v is PlanTier =>
  v === "unpaid" || v === "basic" || v === "standard" || v === "premium";

const toIsoOrNull = (value: unknown) => {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const effectivePlan = (plan: PlanTier, expiresAt: string | null) => {
  if (!expiresAt) return plan;
  return Date.now() > new Date(expiresAt).getTime() ? "unpaid" : plan;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify caller is admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing auth" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user: requester }, error: reqErr } = await userClient.auth.getUser();
  if (reqErr || !requester || requester.user_metadata?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // GET — list users
  if (req.method === "GET") {
    const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const users = (data.users || []).map((u) => {
      const userPlan = isValidPlan(u.user_metadata?.plan) ? u.user_metadata.plan : "unpaid";
      const expiresAt = (u.user_metadata?.subscription_expires_at as string) || null;
      const isExpired = Boolean(expiresAt) && Date.now() > new Date(expiresAt!).getTime();
      return {
        id: u.id,
        email: u.email || "",
        fullName: (u.user_metadata?.full_name as string) || null,
        role: u.user_metadata?.role === "admin" ? "admin" : "customer",
        plan: isExpired ? "unpaid" : userPlan,
        rawPlan: userPlan,
        canSelfManagePlan: Boolean(u.user_metadata?.can_self_manage_plan),
        isTestingAccount: Boolean(u.user_metadata?.is_testing_account),
        subscriptionExpiresAt: expiresAt,
        isExpired,
        lastSignInAt: u.last_sign_in_at || null,
        createdAt: u.created_at,
      };
    });

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // POST — actions
  const body = await req.json().catch(() => ({}));
  const action = body.action;

  if (action === "create") {
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const fullName = String(body.fullName || "").trim() || null;
    const plan = body.plan;
    const expiresAt = toIsoOrNull(body.expiresAt);

    if (!email || !password || !isValidPlan(plan) || plan === "unpaid") {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: "customer",
        plan,
        can_self_manage_plan: Boolean(body.canSelfManagePlan),
        is_testing_account: false,
        subscription_expires_at: expiresAt,
      },
    });

    if (error || !data.user) {
      return new Response(JSON.stringify({ error: error?.message || "Cannot create" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dbPlan = effectivePlan(plan, expiresAt);
    await adminClient.from("profiles").update({ full_name: fullName, plan: dbPlan }).eq("id", data.user.id);

    return new Response(JSON.stringify({ user: { id: data.user.id, email: data.user.email } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (action === "assignPlan") {
    const userId = String(body.userId || "").trim();
    const plan = body.plan;
    const expiresAt = toIsoOrNull(body.expiresAt);
    const fullName = String(body.fullName || "").trim() || null;

    if (!userId || !isValidPlan(plan)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing, error: getErr } = await adminClient.auth.admin.getUserById(userId);
    if (getErr || !existing.user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existing.user.user_metadata?.role === "admin") {
      return new Response(JSON.stringify({ error: "Cannot modify admin" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const meta = {
      ...(existing.user.user_metadata || {}),
      full_name: fullName ?? existing.user.user_metadata?.full_name ?? null,
      role: "customer",
      plan,
      can_self_manage_plan: Boolean(body.canSelfManagePlan),
      is_testing_account: false,
      subscription_expires_at: expiresAt,
    };

    const { error: updateErr } = await adminClient.auth.admin.updateUserById(userId, { user_metadata: meta });
    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dbPlan = effectivePlan(plan, expiresAt);
    await adminClient.from("profiles").update({ full_name: fullName, plan: dbPlan }).eq("id", userId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (action === "delete") {
    const userId = String(body.userId || "").trim();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existing, error: getErr } = await adminClient.auth.admin.getUserById(userId);
    if (getErr || !existing.user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existing.user.user_metadata?.role === "admin") {
      return new Response(JSON.stringify({ error: "Cannot delete admin" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: delErr } = await adminClient.auth.admin.deleteUser(userId);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
