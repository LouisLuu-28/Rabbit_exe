import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Bạn là trợ lý AI thông minh cho hệ thống quản lý nhà hàng. Bạn có thể:
- Trả lời câu hỏi và hỗ trợ người dùng
- Tra cứu thông tin về đơn hàng, nguyên liệu, món ăn
- Thêm món ăn mới, nguyên liệu mới vào hệ thống
- Đưa ra gợi ý và phân tích dữ liệu

Hãy trả lời bằng tiếng Việt, thân thiện và chuyên nghiệp. Khi cần tra cứu hoặc thêm dữ liệu, hãy sử dụng các công cụ có sẵn.`;

    const tools = [
      {
        type: "function",
        name: "search_menu_items",
        description: "Tra cứu thông tin món ăn trong thực đơn. Trả về danh sách các món ăn với tên, giá, mô tả.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Từ khóa tìm kiếm món ăn" }
          },
          required: ["query"]
        }
      },
      {
        type: "function",
        name: "search_ingredients",
        description: "Tra cứu thông tin nguyên liệu trong kho. Trả về thông tin tồn kho, giá, nhà cung cấp.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Từ khóa tìm kiếm nguyên liệu" }
          },
          required: ["query"]
        }
      },
      {
        type: "function",
        name: "search_orders",
        description: "Tra cứu thông tin đơn hàng. Tìm kiếm theo tên khách hàng, số điện thoại hoặc mã đơn.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Từ khóa tìm kiếm đơn hàng (tên, sdt, mã)" }
          },
          required: ["query"]
        }
      },
      {
        type: "function",
        name: "get_statistics",
        description: "Lấy thống kê tổng quan về doanh thu, đơn hàng, tồn kho.",
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      }
    ];

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
