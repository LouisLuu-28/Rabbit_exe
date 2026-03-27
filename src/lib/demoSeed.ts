import { supabase } from "@/integrations/supabase/client";
import type { PlanTier } from "@/lib/subscription";
import { getActiveSessionUser } from "@/lib/authSession";

interface SeedResult {
  ingredients: number;
  menuItems: number;
  orders: number;
  financialRecords: number;
}

export async function seedDemoDataForCurrentUser(plan: PlanTier): Promise<{ result?: SeedResult; error?: string }> {
  const { user, error: sessionError } = await getActiveSessionUser();

  if (!user) {
    return { error: `Bạn chưa đăng nhập (${sessionError || "session hết hạn"})` };
  }

  if (plan === "unpaid") {
    return {
      result: {
        ingredients: 0,
        menuItems: 0,
        orders: 0,
        financialRecords: 0,
      },
    };
  }

  const suffix = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(8, 14);

  const ingredientsPayload = [
    {
      user_id: user.id,
      name: `Gạo ST25 ${suffix}`,
      category: "do_kho",
      unit: "kg",
      current_stock: 30,
      min_stock: 10,
      cost_per_unit: 22000,
      supplier_info: "NCC Demo A",
      code: `NL-DEMO-${suffix}-1`,
    },
    {
      user_id: user.id,
      name: `Ức gà ${suffix}`,
      category: "thit",
      unit: "kg",
      current_stock: 12,
      min_stock: 5,
      cost_per_unit: 95000,
      supplier_info: "NCC Demo B",
      code: `NL-DEMO-${suffix}-2`,
    },
    {
      user_id: user.id,
      name: `Rau củ mix ${suffix}`,
      category: "rau_cu",
      unit: "kg",
      current_stock: 8,
      min_stock: 3,
      cost_per_unit: 30000,
      supplier_info: "NCC Demo C",
      code: `NL-DEMO-${suffix}-3`,
    },
  ];

  const { data: ingredients, error: ingredientError } = await supabase
    .from("ingredients")
    .insert(ingredientsPayload)
    .select("id, name, unit");

  if (ingredientError || !ingredients) {
    return { error: ingredientError?.message || "Không thể tạo dữ liệu nguyên liệu" };
  }

  const menuPayload = [
    {
      user_id: user.id,
      code: `TD-DEMO-${suffix}-1`,
      name: `Cơm gà demo ${suffix}`,
      description: "Món demo phục vụ kiểm thử phân gói",
      category: "main",
      price: 45000,
      is_available: true,
      dish_style: "dry",
      dish_type: "meat",
    },
    {
      user_id: user.id,
      code: `TD-DEMO-${suffix}-2`,
      name: `Canh rau demo ${suffix}`,
      description: "Món demo phục vụ kiểm thử phân gói",
      category: "side",
      price: 25000,
      is_available: true,
      flavor_type: "savory",
    },
  ];

  const { data: menuItems, error: menuError } = await supabase
    .from("menu_items")
    .insert(menuPayload)
    .select("id, name, price");

  if (menuError || !menuItems) {
    return { error: menuError?.message || "Không thể tạo dữ liệu món ăn" };
  }

  const linksPayload = [
    {
      menu_item_id: menuItems[0].id,
      ingredient_id: ingredients[0].id,
      quantity_needed: 0.2,
    },
    {
      menu_item_id: menuItems[0].id,
      ingredient_id: ingredients[1].id,
      quantity_needed: 0.15,
    },
    {
      menu_item_id: menuItems[1].id,
      ingredient_id: ingredients[2].id,
      quantity_needed: 0.1,
    },
  ];

  const { error: linkError } = await supabase.from("menu_item_ingredients").insert(linksPayload);
  if (linkError) {
    return { error: linkError.message };
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const orderPayload = [
    {
      user_id: user.id,
      code: `DH-DEMO-${suffix}-1`,
      customer_name: "Khách Demo 1",
      customer_phone: "0900000001",
      order_date: today.toISOString().slice(0, 10),
      status: "pending",
      total_amount: 115000,
      notes: "Đơn test phân gói",
    },
    {
      user_id: user.id,
      code: `DH-DEMO-${suffix}-2`,
      customer_name: "Khách Demo 2",
      customer_phone: "0900000002",
      order_date: yesterday.toISOString().slice(0, 10),
      status: "delivered",
      total_amount: 90000,
      notes: "Đơn test phân gói",
    },
  ];

  const { data: orders, error: orderError } = await supabase
    .from("orders")
    .insert(orderPayload)
    .select("id");

  if (orderError || !orders) {
    return { error: orderError?.message || "Không thể tạo dữ liệu đơn hàng" };
  }

  const orderItemsPayload = [
    {
      order_id: orders[0].id,
      menu_item_id: menuItems[0].id,
      quantity: 2,
      unit_price: 45000,
      subtotal: 90000,
    },
    {
      order_id: orders[0].id,
      menu_item_id: menuItems[1].id,
      quantity: 1,
      unit_price: 25000,
      subtotal: 25000,
    },
    {
      order_id: orders[1].id,
      menu_item_id: menuItems[0].id,
      quantity: 2,
      unit_price: 45000,
      subtotal: 90000,
    },
  ];

  const { error: orderItemsError } = await supabase.from("order_items").insert(orderItemsPayload);
  if (orderItemsError) {
    return { error: orderItemsError.message };
  }

  let financialRecords = 0;
  if (plan === "standard" || plan === "premium") {
    const financialPayload = [
      {
        user_id: user.id,
        type: "expense",
        amount: 350000,
        category: "Nguyên liệu",
        description: "Chi phí nhập hàng demo",
        record_date: today.toISOString().slice(0, 10),
      },
      {
        user_id: user.id,
        type: "revenue",
        amount: 205000,
        category: "Đơn hàng",
        description: "Doanh thu demo",
        record_date: today.toISOString().slice(0, 10),
      },
    ];

    const { error: financialError } = await supabase.from("financial_records").insert(financialPayload);
    if (financialError) {
      return { error: financialError.message };
    }
    financialRecords = financialPayload.length;
  }

  return {
    result: {
      ingredients: ingredientsPayload.length,
      menuItems: menuPayload.length,
      orders: orderPayload.length,
      financialRecords,
    },
  };
}
