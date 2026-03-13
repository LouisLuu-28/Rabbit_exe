import { GoogleGenerativeAI } from "@google/generative-ai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Chỉ chấp nhận phương thức POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { message, history } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('GEMINI_API_KEY không được thiết lập');
            return res.status(500).json({ error: 'Chưa thiết lập GEMINI_API_KEY trên Vercel' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Cấu hình hướng dẫn hệ thống (System Prompt) - Cách hiện đại dùng systemInstruction
        const systemPrompt = `Bạn là một trợ lý AI thông minh tích hợp trong hệ thống Rabbit EMS (Enterprise Management System), một giải pháp quản lý F&B (Thực phẩm & Đồ uống).
Nhiệm vụ của bạn:
1. Hỗ trợ người dùng quản lý kho hàng (ingredients), đơn hàng (orders), thực đơn (menu) và tài chính.
2. Trả lời các câu hỏi về chuyên môn quản lý nhà hàng, tối ưu chi phí nguyên liệu.
3. Luôn giữ thái độ chuyên nghiệp, thân thiện và sử dụng tiếng Việt.
4. Nếu người dùng hỏi về dữ liệu cụ thể mà bạn chưa có, hãy hướng dẫn họ xem trong các bảng tương ứng (Kho hàng, Đơn hàng...).

Hãy trả lời ngắn gọn, súc tích và tập trung vào giải pháp.`;

        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.1-pro-preview",
            systemInstruction: systemPrompt,
        });

        // Chuẩn bị lịch sử hội thoại cho SDK (không cần systemPrompt trong history nữa)
        const formattedHistory = (history || []).map((msg: any) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));

        const chat = model.startChat({
            history: formattedHistory,
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const responseText = response.text();

        return res.status(200).json({ text: responseText });
    } catch (error: any) {
        console.error('Lỗi API chat:', error);
        return res.status(500).json({ error: 'Đã xảy ra lỗi khi xử lý yêu cầu của bạn: ' + error.message });
    }
}
