import { GoogleGenerativeAI } from "@google/generative-ai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { message, history } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) return res.status(500).json({ error: 'Chưa thiết lập GEMINI_API_KEY' });

        const genAI = new GoogleGenerativeAI(apiKey);

        const systemPrompt = `Bạn là trợ lý AI thông minh của Rabbit EMS (Giải pháp quản lý F&B).
Nhiệm vụ: Hỗ trợ người dùng về các câu hỏi liên quan đến quản lý nhà hàng, kho hàng, thực đơn, đơn hàng và tài chính.

Lưu ý: Bạn không có quyền truy cập trực tiếp vào dữ liệu trong hệ thống. Khi người dùng hỏi về dữ liệu cụ thể (nguyên liệu trong kho, đơn hàng, menu...), hãy hướng dẫn họ xem trong các module tương ứng trên giao diện:
- Kho hàng: Module "Quản lý Kho (Inventory)"
- Thực đơn: Module "Lập kế hoạch thực đơn (Menu Planning)"
- Đơn hàng: Module "Quản lý đơn hàng (Orders)"
- Tài chính: Module "Báo cáo tài chính (Financial)"

Bạn có thể tư vấn về:
- Cách quản lý kho hiệu quả
- Tối ưu chi phí nguyên liệu
- Lập kế hoạch thực đơn
- Quy trình xử lý đơn hàng
- Phân tích tài chính cơ bản

Thái độ: Chuyên nghiệp, thân thiện, trả lời ngắn gọn bằng tiếng Việt.`;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: systemPrompt,
        });

        const formattedHistory = (history || []).map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({ history: formattedHistory });
        const result = await chat.sendMessage(message);
        const response = result.response;

        return res.status(200).json({ text: response.text() });
    } catch (error: any) {
        console.error('Lỗi API chat:', error);
        return res.status(500).json({ error: 'Lỗi xử lý yêu cầu: ' + error.message });
    }
}
