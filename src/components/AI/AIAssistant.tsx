import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Minus, Bot, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export const AIAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Chào bạn! Tôi là trợ lý AI của Rabbit EMS. Tôi có thể giúp gì cho bạn hôm nay?" }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSendMessage = async (content: string) => {
        const userMessage: Message = { role: "user", content };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            // Gọi tới Vercel Serverless Function
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: content,
                    userId: user?.id,
                    history: messages.slice(1).map(msg => ({
                        role: msg.role === 'user' ? 'user' : 'model',
                        content: msg.content
                    }))
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Giao tiếp với AI thất bại");
            }

            const data = await response.json();

            if (data?.text) {
                setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
            } else {
                throw new Error("Không nhận được phản hồi từ AI");
            }
        } catch (error) {
            console.error("Lỗi khi chat với AI:", error);
            toast.error("Có lỗi xảy ra khi kết nối với trợ lý AI.");
            setMessages((prev) => [...prev, { role: "assistant", content: "Xin lỗi, tôi gặp trục trặc khi kết nối. Bạn vui lòng thử lại sau nhé!" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <Card className="mb-4 w-[350px] sm:w-[400px] h-[500px] flex flex-col shadow-2xl border-primary/20 animate-in slide-in-from-bottom-5 duration-300">
                    <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between rounded-t-lg">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-lg">
                                <Bot className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold">Trợ lý Rabbit AI</CardTitle>
                                <div className="flex items-center gap-1">
                                    <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                                    <span className="text-[10px] opacity-80 uppercase tracking-wider">Trực tuyến</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-white/10" onClick={() => setIsOpen(false)}>
                                <Minus className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-white/10" onClick={() => setIsOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-hidden p-0 bg-muted/30">
                        <ScrollArea className="h-full p-4">
                            {messages.map((msg, index) => (
                                <ChatMessage key={index} role={msg.role} content={msg.content} />
                            ))}
                            {isLoading && (
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="bg-muted h-8 w-8 rounded-full flex items-center justify-center border shadow animate-bounce">
                                        <Bot className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="bg-muted px-4 py-2 rounded-2xl rounded-bl-none shadow-sm">
                                        <div className="flex gap-1">
                                            <span className="h-1.5 w-1.5 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="h-1.5 w-1.5 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="h-1.5 w-1.5 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </ScrollArea>
                    </CardContent>

                    <CardFooter className="p-0 border-t bg-card">
                        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
                    </CardFooter>
                </Card>
            )}

            {/* Floating Toggle Button */}
            <Button
                size="icon"
                className={cn(
                    "h-14 w-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95",
                    isOpen ? "bg-destructive hover:bg-destructive/90 rotate-90" : "bg-primary hover:bg-primary/90"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? (
                    <X className="h-7 w-7" />
                ) : (
                    <div className="relative">
                        <MessageSquare className="h-7 w-7" />
                        <div className="absolute -top-1 -right-1">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-white/50"></span>
                            </span>
                        </div>
                    </div>
                )}
            </Button>
        </div>
    );
};
