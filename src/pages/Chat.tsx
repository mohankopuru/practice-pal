import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Shield } from "lucide-react";
import { categories } from "@/data/categories";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";

type Msg = { role: "user" | "assistant"; content: string };

const SAFETY_KEYWORDS = [
  "kill myself", "suicide", "end my life", "want to die",
  "hurt myself", "self harm", "child porn", "cp ", "underage",
  "sexual harassment", "rape", "bomb", "shoot up", "terrorism",
];

const SAFETY_RESPONSE = `I notice this conversation has touched on something very serious. If you or someone you know is in crisis, please reach out:

🆘 **National Suicide Prevention Lifeline**: 988 (US)
🆘 **Crisis Text Line**: Text HOME to 741741
🆘 **Emergency**: Call 911

This is a practice tool and cannot provide real help in emergencies. Please reach out to a professional. ❤️`;

function checkSafety(text: string): boolean {
  const lower = text.toLowerCase();
  return SAFETY_KEYWORDS.some((kw) => lower.includes(kw));
}

const Chat = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const category = categories.find((c) => c.id === categoryId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!category) return;
    // Initial greeting
    setIsTyping(true);
    const greetings: Record<string, string> = {
      friend: "Hey! What's up? 😊 How's your day going?",
      partner: "Hi love ❤️ How was your day? I missed you!",
      boss: "Good morning. Please have a seat. What would you like to discuss?",
      spouse: "Hey hon, how was work today? I was thinking we should talk about something…",
      coworker: "Hey! Grab some coffee yet? I just came from that meeting — wild stuff.",
      therapist: "Welcome. I'm glad you're here today. How are you feeling? Take your time.",
      shopkeeper: "Welcome to our store! Can I help you find anything today?",
      interviewer: "Thank you for coming in today. Please take a seat. Shall we begin?",
    };
    const timeout = setTimeout(() => {
      setMessages([
        { role: "assistant", content: greetings[category.id] || `Hi! I'm your ${category.name}. How can I help?` },
      ]);
      setIsTyping(false);
    }, 800);
    return () => clearTimeout(timeout);
  }, [category]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    // Safety check
    if (checkSafety(text)) {
      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "assistant", content: SAFETY_RESPONSE }]);
        setIsTyping(false);
      }, 600);
      return;
    }

    // Simulated response (will be replaced by Lovable AI)
    setIsTyping(true);
    setTimeout(() => {
      const responses = [
        "That's really interesting — tell me more about that.",
        "I hear you. How does that make you feel?",
        "That's a great point. Let me think about that for a moment…",
        "I appreciate you sharing that with me. Can you elaborate?",
        "Hmm, I see where you're coming from. What do you think the next step should be?",
      ];
      const reply = responses[Math.floor(Math.random() * responses.length)];
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  if (!category) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Category not found.</p>
      </div>
    );
  }

  const Icon = category.icon;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Chat Header */}
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={() => navigate("/")} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: category.color + "18", color: category.color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-sm font-semibold text-foreground">{category.name}</h2>
          <p className="text-xs text-muted-foreground">Conversation practice</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">Safe mode</span>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 flex items-center justify-center"
          >
            <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
              This is a practice conversation — not real advice
            </span>
          </motion.div>
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}
          {isTyping && <TypingIndicator />}
        </div>
      </div>

      {/* Input */}
      <div className="mx-auto w-full max-w-2xl">
        <ChatInput onSend={handleSend} disabled={isTyping} />
      </div>
    </div>
  );
};

export default Chat;
