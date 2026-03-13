import { GoogleGenerativeAI } from "@google/generative-ai";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as inventoryTools from "./_lib/inventory-tools";
import * as menuTools from "./_lib/menu-tools";
import * as orderTools from "./_lib/order-tools";
import * as financialTools from "./_lib/financial-tools";

import * as fs from 'fs';
import * as path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { message, history, userId } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) return res.status(500).json({ error: 'Chưa thiết lập GEMINI_API_KEY' });

        // Đọc dữ liệu từ file knowledge_base.md
        let knowledgeContext = "";
        try {
            const knowledgePath = path.join(process.cwd(), 'knowledge_base.md');
            if (fs.existsSync(knowledgePath)) {
                knowledgeContext = fs.readFileSync(knowledgePath, 'utf8');
            }
        } catch (err) {
            console.error("Không thể đọc file knowledge_base.md:", err);
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        const systemPrompt = `Bạn là trợ lý AI thông minh của Rabbit EMS (Giải pháp quản lý F&B).
Nhiệm vụ: Hỗ trợ quản trị toàn diện các module: Kho, Thực đơn, Đơn hàng và Tài chính.

DƯỚI ĐÂY LÀ KIẾN THỨC CỐ ĐỊNH CỦA QUÁN (Hãy dùng nó để trả lời Q&A):
${knowledgeContext}

QUAN TRỌNG: Bạn CÓ QUYỀN TRUY CẬP dữ liệu thực tế hệ thống thông qua các công cụ (tools) được cung cấp. 
KHI NGƯỜI DÙNG HỎI về tồn kho, thực đơn, đơn hàng hoặc doanh thu, bạn BẮT BUỘC phải gọi hàm tương ứng để lấy dữ liệu mới nhất trước khi trả lời. Tuyệt đối không được đoán hoặc trả lời là không có dữ liệu nếu chưa gọi hàm kiểm tra.
Thái độ: Chuyên nghiệp, thân thiện, trả lời bằng tiếng Việt.`;

        // Định nghĩa các công cụ toàn diện cho AI
        const tools = [
            {
                functionDeclarations: [
                    // Inventory Tools
                    { name: "get_inventory", description: "Lấy danh sách toàn bộ nguyên liệu trong kho hiện tại." },
                    { name: "get_low_stock_items", description: "Lấy danh sách các nguyên liệu sắp hết hàng để cảnh báo." },
                    { name: "get_expiring_items", description: "Lấy danh sách nguyên liệu sắp hết hạn sử dụng trong vòng 7 ngày." },
                    { name: "get_recent_movements", description: "Lấy lịch sử nhập xuất kho gần đây." },
                    // Menu Tools
                    { name: "get_menu", description: "Lấy toàn bộ thực đơn hiện có của quán." },
                    {
                        name: "get_menu_by_category",
                        description: "Lấy các món ăn theo danh mục cụ thể (main, side, drink, dessert).",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                category: { type: "STRING", description: "Danh mục: 'main', 'side', 'drink', 'dessert'." }
                            },
                        }
                    },
                    { name: "get_available_menu", description: "Lấy danh sách các món ăn đang còn hàng." },
                    // Order Tools
                    {
                        name: "get_recent_orders",
                        description: "Lấy danh sách các đơn hàng mới nhất gần đây.",
                        parameters: {
                            type: "OBJECT",
                            properties: { limit: { type: "NUMBER" } }
                        }
                    },
                    {
                        name: "get_orders_by_status",
                        description: "Lấy các đơn hàng theo trạng thái cụ thể.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                status: { type: "STRING", description: "Trạng thái: 'pending', 'preparing', 'ready', 'delivered', 'cancelled'." }
                            }
                        }
                    },
                    {
                        name: "get_order_details",
                        description: "Xem chi tiết một đơn hàng cụ thể kèm các món ăn.",
                        parameters: {
                            type: "OBJECT",
                            properties: { orderId: { type: "STRING" } }
                        }
                    },
                    // Financial Tools
                    {
                        name: "get_financial_summary",
                        description: "Báo cáo doanh thu, chi phí và lợi nhuận ròng trong một khoảng thời gian.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                startDate: { type: "STRING", description: "Ngày bắt đầu (YYYY-MM-DD)." },
                                endDate: { type: "STRING", description: "Ngày kết thúc (YYYY-MM-DD)." }
                            }
                        }
                    },
                    {
                        name: "get_recent_financial_records",
                        description: "Xem các bản ghi thu chi gần nhất.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                type: { type: "STRING", description: "Loại: 'income' hoặc 'expense'." },
                                limit: { type: "NUMBER" }
                            }
                        }
                    }
                ],
            },
        ];

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: systemPrompt,
            tools: tools as any,
        });

        const formattedHistory = (history || []).map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({ history: formattedHistory });
        let result = await chat.sendMessage(message);
        let response = result.response;

        // Vòng lặp xử lý Function Calling
        while (response.candidates?.[0]?.content?.parts?.some(part => part.functionCall)) {
            const functionCalls = response.candidates[0].content.parts.filter(part => part.functionCall);
            const functionResponses = [];

            for (const fc of functionCalls) {
                const { name, args } = fc.functionCall!;
                console.log(`[AI-DEBUG] AI gọi hàm: ${name}`, args);

                let data;
                if (!userId) {
                    data = { error: "Không tìm thấy định danh người dùng." };
                } else {
                    try {
                        const a = args as any;
                        // Inventory
                        if (name === "get_inventory") data = await inventoryTools.get_inventory(userId);
                        else if (name === "get_low_stock_items") data = await inventoryTools.get_low_stock_items(userId);
                        else if (name === "get_expiring_items") data = await inventoryTools.get_expiring_items(userId);
                        else if (name === "get_recent_movements") data = await inventoryTools.get_recent_movements(userId);
                        // Menu
                        else if (name === "get_menu") data = await menuTools.get_menu(userId);
                        else if (name === "get_menu_by_category") data = await menuTools.get_menu_by_category(userId, a.category);
                        else if (name === "get_available_menu") data = await menuTools.get_available_menu(userId);
                        // Orders
                        else if (name === "get_recent_orders") data = await orderTools.get_recent_orders(userId, a.limit);
                        else if (name === "get_orders_by_status") data = await orderTools.get_orders_by_status(userId, a.status);
                        else if (name === "get_order_details") data = await orderTools.get_order_details(a.orderId);
                        // Financial
                        else if (name === "get_financial_summary") data = await financialTools.get_financial_summary(userId, a.startDate, a.endDate);
                        else if (name === "get_recent_financial_records") data = await financialTools.get_recent_financial_records(userId, a.type, a.limit);
                        else data = { error: `Hàm ${name} không tồn tại.` };
                    } catch (e: any) {
                        console.error(`[AI-ERROR] Lỗi khi thực thi hàm ${name}:`, e);
                        data = { error: `Lỗi khi thực thi hàm: ${e.message}` };
                    }
                }

                console.log(`[AI-DEBUG] Kết quả từ ${name}:`, Array.isArray(data) ? `Tìm thấy ${data.length} bản ghi` : data);

                functionResponses.push({
                    functionResponse: {
                        name,
                        response: { content: data }
                    }
                });
            }

            result = await chat.sendMessage(functionResponses as any);
            response = result.response;
        }

        return res.status(200).json({ text: response.text() });
    } catch (error: any) {
        console.error('Lỗi API chat:', error);
        return res.status(500).json({ error: 'Lỗi xử lý yêu cầu: ' + error.message });
    }
}
