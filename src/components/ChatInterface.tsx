"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Loader2 } from "lucide-react";
import clsx from "clsx";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) throw new Error("Failed to fetch response");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, content: lastMsg.content + chunk },
          ];
        });
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-5xl mx-auto p-4 md:p-6 relative">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 pt-2">
        <h1 className="text-2xl font-bold gemini-gradient-text tracking-tight">Omni-Doc</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-6 px-2 md:px-6 space-y-6 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="text-5xl font-bold mb-4 gemini-gradient-text">Hello! I am Omni-Doc.</div>
            <p className="text-gray-400 text-lg max-w-md">
              Ask me anything about the documents in your knowledge base. I can summarize, find information, and give recommendations.
            </p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={clsx("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}>
            <div 
              className={clsx(
                "max-w-[85%] md:max-w-[75%] rounded-3xl p-5 shadow-sm text-[15px]",
                msg.role === "user" 
                  ? "bg-[#2b2d31] text-gray-100 rounded-br-sm" 
                  : "glass-panel text-gray-200 rounded-bl-sm"
              )}
            >
              {msg.role === "assistant" ? (
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              )}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="glass-panel rounded-3xl rounded-bl-sm p-5 flex items-center gap-3 text-gray-400">
              <Loader2 size={18} className="animate-spin text-blue-400" />
              <span className="text-sm">Omni-Doc is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="relative mt-auto pb-4">
        <div className="relative flex items-end bg-[#1e1f20] border border-white/10 rounded-3xl p-2 shadow-xl focus-within:border-white/20 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask a question about your documents..."
            className="w-full bg-transparent border-none outline-none resize-none px-4 py-3 text-gray-200 placeholder-gray-500 min-h-[48px] max-h-40 overflow-y-auto scrollbar-hide text-[15px]"
            rows={1}
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-3 mb-1 mr-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5 rounded-full text-white ml-2 transition-colors flex-shrink-0"
          >
            <Send size={20} />
          </button>
        </div>
        <div className="text-center mt-3">
          <span className="text-[11px] text-gray-500">Omni-Doc can make mistakes. Consider verifying important information.</span>
        </div>
      </form>
    </div>
  );
}
