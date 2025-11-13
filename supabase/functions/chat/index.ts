import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase not configured");

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    // Client with user token for inserts/updates (needs user_id)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    
    // Admin client with service role for reading data (bypasses RLS)
    const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const systemPrompt = `Bạn là trợ lý AI thông minh cho hệ thống quản lý nhà hàng. Bạn CÓ THỂ truy cập dữ liệu thực tế và thực hiện các tác vụ sau:

**TRẢ LỜI VỀ DỮ LIỆU:**
- Kiểm tra tồn kho nguyên liệu, món ăn trong thực đơn, đơn hàng
- Xem thống kê doanh thu, chi phí, tồn kho
- Tìm kiếm thông tin cụ thể về món ăn, nguyên liệu, đơn hàng
- Cảnh báo hàng sắp hết hạn, tồn kho thấp, hàng chậm luân chuyển

**THỰC HIỆN TÁC VỤ:**
- Thêm món ăn mới vào thực đơn
- Thêm nguyên liệu mới vào kho
- Đưa ra gợi ý về quản lý nhà hàng

**QUAN TRỌNG:** Khi người dùng hỏi về dữ liệu (thực đơn, nguyên liệu, đơn hàng, thống kê), hãy SỬ DỤNG CÔNG CỤ để lấy dữ liệu thực tế thay vì nói bạn không có quyền truy cập.

Hãy trả lời bằng tiếng Việt, thân thiện, chuyên nghiệp và luôn cung cấp thông tin dựa trên dữ liệu thực tế.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "add_menu_item",
          description: "Thêm món ăn mới vào thực đơn",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Tên món ăn" },
              description: { type: "string", description: "Mô tả món ăn" },
              price: { type: "number", description: "Giá món ăn" },
              category: { type: "string", description: "Phân loại: main/appetizer/dessert/drink" }
            },
            required: ["name", "price"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_ingredient",
          description: "Thêm nguyên liệu mới vào kho",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Tên nguyên liệu" },
              unit: { type: "string", description: "Đơn vị tính (kg, lít, gói, ...)" },
              current_stock: { type: "number", description: "Số lượng tồn kho hiện tại" },
              min_stock: { type: "number", description: "Số lượng tồn kho tối thiểu" },
              cost_per_unit: { type: "number", description: "Giá mỗi đơn vị" },
              supplier_info: { type: "string", description: "Thông tin nhà cung cấp" },
              category: { type: "string", description: "Phân loại nguyên liệu" }
            },
            required: ["name", "unit", "cost_per_unit"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "search_menu_items",
          description: "Tra cứu thông tin món ăn trong thực đơn",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Từ khóa tìm kiếm món ăn (tên hoặc mô tả)" }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "search_ingredients",
          description: "Tra cứu thông tin nguyên liệu trong kho",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Từ khóa tìm kiếm nguyên liệu" }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "search_orders",
          description: "Tra cứu thông tin đơn hàng",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Từ khóa tìm kiếm (tên khách hàng, số điện thoại, mã đơn)" }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_statistics",
          description: "Lấy thống kê tổng quan về doanh thu, đơn hàng, tồn kho",
          parameters: {
            type: "object",
            properties: {
              period: { type: "string", description: "Khoảng thời gian: today/week/month/year", enum: ["today", "week", "month", "year"] }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_all_ingredients",
          description: "Lấy danh sách TẤT CẢ nguyên liệu trong kho với thông tin chi tiết (tồn kho, giá, hạn sử dụng, nhà cung cấp)",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_all_menu_items",
          description: "Lấy danh sách TẤT CẢ món ăn trong thực đơn với thông tin chi tiết (giá, mô tả, phân loại)",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_recent_orders",
          description: "Lấy danh sách đơn hàng gần đây với thông tin chi tiết",
          parameters: {
            type: "object",
            properties: {
              limit: { type: "number", description: "Số lượng đơn hàng cần lấy (mặc định 20)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_low_stock_items",
          description: "Lấy danh sách nguyên liệu có tồn kho THẤP HƠN mức tối thiểu",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_expiring_items",
          description: "Lấy danh sách nguyên liệu SẮP HẾT HẠN (trong vòng 7 ngày) hoặc ĐÃ HẾT HẠN",
          parameters: {
            type: "object",
            properties: {
              days: { type: "number", description: "Số ngày kiểm tra (mặc định 7)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_slow_moving_items",
          description: "Lấy danh sách hàng tồn kho CHẬM LUÂN CHUYỂN (trên 10 ngày)",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      }
    ];

    // First call to check for tool usage
    const initialResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools,
        tool_choice: "auto",
      }),
    });

    if (!initialResponse.ok) {
      const errorText = await initialResponse.text();
      console.error("AI gateway error:", initialResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Lỗi AI gateway" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const initialData = await initialResponse.json();
    const choice = initialData.choices?.[0];

    // Check if AI wants to use tools
    if (choice?.message?.tool_calls) {
      const toolResults = [];
      
      for (const toolCall of choice.message.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        
        console.log("Executing tool:", functionName, args);
        
        let result;
        if (functionName === "add_menu_item") {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            result = { success: false, error: "Người dùng chưa đăng nhập" };
          } else {
            const { data: codeData } = await supabase.rpc("generate_menu_item_code", { p_user_id: userData.user.id });
            const { data, error } = await supabase.from("menu_items").insert({
              user_id: userData.user.id,
              name: args.name,
              description: args.description || null,
              price: args.price,
              category: args.category || "main",
              code: codeData,
            }).select().maybeSingle();
            
            result = error ? { success: false, error: error.message } : { success: true, data };
          }
        } else if (functionName === "add_ingredient") {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            result = { success: false, error: "Người dùng chưa đăng nhập" };
          } else {
            const { data: codeData } = await supabase.rpc("generate_ingredient_code", { p_user_id: userData.user.id });
            const { data, error } = await supabase.from("ingredients").insert({
              user_id: userData.user.id,
              name: args.name,
              unit: args.unit,
              current_stock: args.current_stock || 0,
              min_stock: args.min_stock || 0,
              cost_per_unit: args.cost_per_unit,
              supplier_info: args.supplier_info || null,
              category: args.category || null,
              code: codeData,
            }).select().maybeSingle();
            
            result = error ? { success: false, error: error.message } : { success: true, data };
          }
        } else if (functionName === "search_menu_items") {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            result = { success: false, error: "Người dùng chưa đăng nhập" };
          } else {
            const { data, error } = await adminSupabase
              .from("menu_items")
              .select("*")
              .eq("user_id", userData.user.id)
              .or(`name.ilike.%${args.query}%,description.ilike.%${args.query}%,code.ilike.%${args.query}%`)
              .limit(10);
            
            result = error ? { success: false, error: error.message } : { success: true, count: data?.length || 0, items: data };
          }
        } else if (functionName === "search_ingredients") {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            result = { success: false, error: "Người dùng chưa đăng nhập" };
          } else {
            const { data, error } = await adminSupabase
              .from("ingredients")
              .select("*")
              .eq("user_id", userData.user.id)
              .or(`name.ilike.%${args.query}%,supplier_info.ilike.%${args.query}%,code.ilike.%${args.query}%,category.ilike.%${args.query}%`)
              .limit(10);
            
            result = error ? { success: false, error: error.message } : { success: true, count: data?.length || 0, items: data };
          }
        } else if (functionName === "search_orders") {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            result = { success: false, error: "Người dùng chưa đăng nhập" };
          } else {
            const { data, error } = await adminSupabase
              .from("orders")
              .select("*, order_items(*, menu_item_id(name))")
              .eq("user_id", userData.user.id)
              .or(`customer_name.ilike.%${args.query}%,customer_phone.ilike.%${args.query}%,code.ilike.%${args.query}%`)
              .order("order_date", { ascending: false })
              .limit(10);
            
            result = error ? { success: false, error: error.message } : { success: true, count: data?.length || 0, orders: data };
          }
        } else if (functionName === "get_statistics") {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            result = { success: false, error: "Người dùng chưa đăng nhập" };
          } else {
            const period = args.period || "week";
            let dateFilter = "";
            const now = new Date();
            
            if (period === "today") {
              dateFilter = now.toISOString().split("T")[0];
            } else if (period === "week") {
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              dateFilter = weekAgo.toISOString().split("T")[0];
            } else if (period === "month") {
              const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              dateFilter = monthAgo.toISOString().split("T")[0];
            } else if (period === "year") {
              const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
              dateFilter = yearAgo.toISOString().split("T")[0];
            }

            const [ordersResult, ingredientsResult, menuItemsResult, financialResult] = await Promise.all([
              adminSupabase.from("orders").select("*").eq("user_id", userData.user.id).gte("order_date", dateFilter),
              adminSupabase.from("ingredients").select("*").eq("user_id", userData.user.id),
              adminSupabase.from("menu_items").select("*").eq("user_id", userData.user.id),
              adminSupabase.from("financial_records").select("*").eq("user_id", userData.user.id).gte("record_date", dateFilter)
            ]);

            const totalRevenue = ordersResult.data?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0;
            const totalOrders = ordersResult.data?.length || 0;
            const pendingOrders = ordersResult.data?.filter(o => o.status === "pending").length || 0;
            const lowStockItems = ingredientsResult.data?.filter(i => Number(i.current_stock) < Number(i.min_stock)).length || 0;
            const totalIngredients = ingredientsResult.data?.length || 0;
            const totalMenuItems = menuItemsResult.data?.length || 0;
            
            const totalExpenses = financialResult.data?.filter(r => r.type === "expense").reduce((sum, r) => sum + Number(r.amount || 0), 0) || 0;
            const totalIncome = financialResult.data?.filter(r => r.type === "income").reduce((sum, r) => sum + Number(r.amount || 0), 0) || 0;

            result = {
              success: true,
              period,
              statistics: {
                revenue: totalRevenue,
                orders: totalOrders,
                pendingOrders,
                menuItems: totalMenuItems,
                ingredients: totalIngredients,
                lowStockItems,
                expenses: totalExpenses,
                income: totalIncome,
                profit: totalIncome - totalExpenses
              }
            };
          }
        } else if (functionName === "get_all_ingredients") {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            result = { success: false, error: "Người dùng chưa đăng nhập" };
          } else {
            const { data, error } = await adminSupabase
              .from("ingredients")
              .select("*")
              .eq("user_id", userData.user.id)
              .order("name");
            
            result = error ? { success: false, error: error.message } : { success: true, count: data?.length || 0, ingredients: data };
          }
        } else if (functionName === "get_all_menu_items") {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            result = { success: false, error: "Người dùng chưa đăng nhập" };
          } else {
            const { data, error } = await adminSupabase
              .from("menu_items")
              .select("*")
              .eq("user_id", userData.user.id)
              .order("name");
            
            result = error ? { success: false, error: error.message } : { success: true, count: data?.length || 0, menu_items: data };
          }
        } else if (functionName === "get_recent_orders") {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            result = { success: false, error: "Người dùng chưa đăng nhập" };
          } else {
            const limit = args.limit || 20;
            const { data, error } = await adminSupabase
              .from("orders")
              .select("*, order_items(*, menu_item_id(name))")
              .eq("user_id", userData.user.id)
              .order("order_date", { ascending: false })
              .limit(limit);
            
            result = error ? { success: false, error: error.message } : { success: true, count: data?.length || 0, orders: data };
          }
        } else if (functionName === "get_low_stock_items") {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            result = { success: false, error: "Người dùng chưa đăng nhập" };
          } else {
            const { data, error } = await adminSupabase
              .from("ingredients")
              .select("*")
              .eq("user_id", userData.user.id)
              .filter("current_stock", "lt", "min_stock")
              .order("current_stock");
            
            result = error ? { success: false, error: error.message } : { success: true, count: data?.length || 0, low_stock_items: data };
          }
        } else if (functionName === "get_expiring_items") {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            result = { success: false, error: "Người dùng chưa đăng nhập" };
          } else {
            const days = args.days || 7;
            const checkDate = new Date();
            checkDate.setDate(checkDate.getDate() + days);
            const checkDateStr = checkDate.toISOString().split("T")[0];
            
            const { data, error } = await adminSupabase
              .from("ingredients")
              .select("*")
              .eq("user_id", userData.user.id)
              .not("expiration_date", "is", null)
              .lte("expiration_date", checkDateStr)
              .order("expiration_date");
            
            result = error ? { success: false, error: error.message } : { success: true, count: data?.length || 0, expiring_items: data };
          }
        } else if (functionName === "get_slow_moving_items") {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            result = { success: false, error: "Người dùng chưa đăng nhập" };
          } else {
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
            const tenDaysAgoStr = tenDaysAgo.toISOString().split("T")[0];
            
            const { data, error } = await adminSupabase
              .from("ingredients")
              .select("*")
              .eq("user_id", userData.user.id)
              .or(`last_purchase_date.lt.${tenDaysAgoStr},and(last_purchase_date.is.null,created_at.lt.${tenDaysAgoStr})`)
              .order("last_purchase_date", { ascending: true, nullsFirst: true });
            
            result = error ? { success: false, error: error.message } : { success: true, count: data?.length || 0, slow_moving_items: data };
          }
        }
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(result),
        });
      }

      // Call AI again with tool results and stream final response
      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            choice.message,
            ...toolResults,
          ],
          stream: true,
        }),
      });

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        console.error("AI gateway error:", finalResponse.status, errorText);
        return new Response(JSON.stringify({ error: "Lỗi AI gateway" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(finalResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls, stream the response directly
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Quá tải, vui lòng thử lại sau." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Hết quota, vui lòng nạp thêm credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Lỗi AI gateway" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Lỗi không xác định" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
