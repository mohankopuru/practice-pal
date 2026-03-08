import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Shield } from "lucide-react";
import { categories, type Persona, type Scenario } from "@/data/categories";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import PersonaSelector from "@/components/PersonaSelector";
import ScenarioSelector from "@/components/ScenarioSelector";

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
  const [activePersona, setActivePersona] = useState<Persona | null>(null);

  // Set default persona on load
  useEffect(() => {
    if (category && category.personas.length > 0) {
      setActivePersona(category.personas[0]);
    }
  }, [category]);

  useEffect(() => {
    if (!category || !activePersona) return;
    // Initial greeting
    setIsTyping(true);
    const greetings: Record<string, Record<string, string>> = {
      boss: {
        friendly: "Hey! Come on in, grab a seat. How's everything going? 😊",
        hostile: "You're late. Sit down. We need to talk about your performance.",
        suspicious: "Close the door. I've been looking at some numbers and I have questions…",
        passive: "Oh, you're here. *That's* nice. I didn't think you'd make it today.",
        mentor: "Good morning! I've been thinking about your career development. Let's chat.",
      },
    };

    const categoryGreetings = greetings[category.id];
    const greeting = categoryGreetings?.[activePersona.id]
      || `Hi! I'm your ${activePersona.emoji} ${activePersona.label} ${category.name}. How can I help?`;

    const timeout = setTimeout(() => {
      setMessages([{ role: "assistant", content: greeting }]);
      setIsTyping(false);
    }, 800);
    return () => clearTimeout(timeout);
  }, [category, activePersona]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const handlePersonaSwitch = (persona: Persona) => {
    if (persona.id === activePersona?.id) return;
    setActivePersona(persona);
    // Add a system message to indicate the switch
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: `*switches to ${persona.emoji} ${persona.label} mode*\n\nAlright, let's continue. What were you saying?` },
    ]);
  };

  const handleSend = (text: string) => {
    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    if (checkSafety(text)) {
      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "assistant", content: SAFETY_RESPONSE }]);
        setIsTyping(false);
      }, 600);
      return;
    }

    // Simulated persona-aware responses (will be replaced by AI)
    setIsTyping(true);
    setTimeout(() => {
      const personaResponses: Record<string, string[]> = {
        friendly: [
          "That's a great point! I really appreciate you bringing this up.",
          "I hear you. Let's figure this out together, shall we?",
          "Thanks for sharing that — how can I help make this better?",
        ],
        hostile: [
          "Is that really the best you can come up with?",
          "I don't have time for excuses. What's your plan to fix this?",
          "Everyone else seems to manage just fine. What's your excuse?",
        ],
        suspicious: [
          "Interesting… and who else was involved in this decision?",
          "That doesn't quite add up. Can you walk me through the details again?",
          "Hmm. I'll need to verify this. Send me the documentation.",
        ],
        passive: [
          "Sure, that's *fine*. I mean, it's not how I would have done it, but…",
          "Oh no, I'm not upset. Why would I be upset? 🙃",
          "That's… interesting. I'm sure you tried your best.",
        ],
        mentor: [
          "Good thinking. Now let me challenge you — have you considered the flip side?",
          "That shows real growth. Here's how you can take it to the next level…",
          "I went through something similar early in my career. Let me share what I learned.",
        ],
      };

      const pid = activePersona?.id || "friendly";
      const pool = personaResponses[pid] || [
        "That's interesting — tell me more.",
        "I see. How does that make you feel?",
        "Let me think about that for a moment…",
      ];
      const reply = pool[Math.floor(Math.random() * pool.length)];
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
          <h2 className="font-display text-sm font-semibold text-foreground">
            {category.name} {activePersona && <span className="font-sans text-xs text-muted-foreground">· {activePersona.emoji} {activePersona.label}</span>}
          </h2>
          <p className="text-xs text-muted-foreground">Conversation practice</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">Safe</span>
        </div>
      </header>

      {/* Persona Selector */}
      {activePersona && (
        <PersonaSelector
          personas={category.personas}
          activeId={activePersona.id}
          onSelect={handlePersonaSwitch}
        />
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 flex items-center justify-center"
          >
            <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
              Practice conversation — switch personas anytime ↑
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
