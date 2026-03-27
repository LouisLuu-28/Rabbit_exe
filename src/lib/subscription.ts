export type PlanTier = "unpaid" | "basic" | "standard" | "premium";

export type FeatureKey =
  | "dashboard"
  | "orders"
  | "menu"
  | "inventory"
  | "financial"
  | "ai"
  | "excel";

export interface PlanDefinition {
  name: string;
  description: string;
  features: FeatureKey[];
}

export const PLAN_ORDER: PlanTier[] = ["unpaid", "basic", "standard", "premium"];

export const FEATURE_MIN_PLAN: Record<FeatureKey, PlanTier> = {
  dashboard: "standard",
  orders: "basic",
  menu: "basic",
  inventory: "basic",
  financial: "standard",
  ai: "premium",
  excel: "premium",
};

export const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = {
  unpaid: {
    name: "Unpaid",
    description: "Xem toàn bộ module ở chế độ chỉ xem (không tạo/sửa/xóa).",
    features: ["dashboard", "orders", "menu", "inventory", "financial"],
  },
  basic: {
    name: "Basic",
    description: "CRUD nguyên liệu, thực đơn, kiểm soát nguyên liệu, quản lý đơn hàng.",
    features: ["orders", "menu", "inventory"],
  },
  standard: {
    name: "Standard",
    description: "Basic + Dashboard, quản lý nguồn nhập, báo cáo tài chính.",
    features: ["orders", "menu", "inventory", "dashboard", "financial"],
  },
  premium: {
    name: "Premium",
    description: "Standard + tính năng Excel nâng cao.",
    features: ["orders", "menu", "inventory", "dashboard", "financial", "excel"],
  },
};

export const DEFAULT_PLAN: PlanTier = "unpaid";

export const normalizePlan = (value: string | null | undefined): PlanTier => {
  if (!value) return DEFAULT_PLAN;
  if (value === "unpaid" || value === "basic" || value === "standard" || value === "premium") {
    return value;
  }
  return DEFAULT_PLAN;
};

export const comparePlan = (current: PlanTier, required: PlanTier): number => {
  return PLAN_ORDER.indexOf(current) - PLAN_ORDER.indexOf(required);
};

export const getRequiredPlanForFeature = (feature: FeatureKey): PlanTier => {
  return FEATURE_MIN_PLAN[feature];
};

export const hasFeature = (plan: PlanTier, feature: FeatureKey): boolean => {
  return PLAN_DEFINITIONS[plan].features.includes(feature);
};

export const isReadOnlyPlan = (plan: PlanTier): boolean => {
  return plan === "unpaid";
};
