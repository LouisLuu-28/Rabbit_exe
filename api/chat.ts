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
        const { message } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) return res.status(500).json({ error: 'Chưa thiết lập GEMINI_API_KEY' });

        const genAI = new GoogleGenerativeAI(apiKey);

        const systemPrompt = `Bạn là trợ lý AI của Rabbit EMS - hệ thống quản lý F&B.
Hỗ trợ tư vấn về quản lý nhà hàng, kho hàng, thực đơn, đơn hàng và tài chính.
Trả lời ngắn gọn, thân thiện bằng tiếng Việt.`;

        const model = genAI.getGenerativeModel({
            model: "gemini-flash-lite-latest",
            systemInstruction: systemPrompt,
        });

        // Không dùng chat history để tiết kiệm quota
        const result = await model.generateContent(message);
        const response = result.response;

        return res.status(200).json({ text: response.text() });
    } catch (error: any) {
        console.error('Lỗi API chat:', error);
        return res.status(500).json({ error: 'Lỗi xử lý yêu cầu: ' + error.message });
    }
}
