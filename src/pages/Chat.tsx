import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Shield } from "lucide-react";
import { categories, type Persona, type Scenario } from "@/data/categories";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import TypingIndicator from "@/components/TypingIndicator";
import PersonaSelector from "@/components/PersonaSelector";
import ScenarioSelector from "@/components/ScenarioSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

function buildSystemPrompt(
  categoryName: string,
  basePrompt: string,
  persona: Persona | null,
  scenario: Scenario | null,
  customScenario: string,
): string {
  let prompt = `${basePrompt}\n\nIMPORTANT RULES:
- Stay in character at all times as a ${categoryName}.
- Keep responses conversational, 1-3 sentences unless the user asks for more detail.
- Never break character or mention that you are an AI.
- If the user says something that indicates suicidal thoughts, self-harm, violence, child exploitation, sexual harassment, or any dangerous/illegal activity, immediately drop character and provide crisis resources.`;

  if (persona) {
    prompt += `\n\nYour personality: ${persona.label}. ${persona.promptModifier}`;
  }
  if (scenario) {
    prompt += `\n\nCurrent scenario: ${scenario.label}. ${scenario.promptModifier}`;
  } else if (customScenario) {
    prompt += `\n\nCurrent scenario (user-defined): ${customScenario}\nAdapt your behavior and responses to fit this situation while staying in character.`;
  }
  return prompt;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

async function streamChat({
  messages,
  systemPrompt,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  systemPrompt: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, systemPrompt }),
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    onError(body.error || `Request failed (${resp.status})`);
    return;
  }
  if (!resp.body) { onError("No response body"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }
  onDone();
}

const Chat = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const category = categories.find((c) => c.id === categoryId);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [customScenario, setCustomScenario] = useState("");

  useEffect(() => {
    if (category && category.personas.length > 0) {
      setActivePersona(category.personas[0]);
    }
  }, [category]);

  // Generate initial greeting via AI
  useEffect(() => {
    if (!category || !activePersona) return;
    setIsTyping(true);
    setMessages([]);

    const systemPrompt = buildSystemPrompt(category.name, category.basePrompt, activePersona, activeScenario);
    const greetingRequest: Msg[] = [
      { role: "user", content: "Start the conversation with a short, natural greeting in character. Don't mention that you're an AI or roleplay bot." },
    ];

    let greeting = "";
    streamChat({
      messages: greetingRequest,
      systemPrompt,
      onDelta: (chunk) => {
        greeting += chunk;
        setMessages([{ role: "assistant", content: greeting }]);
      },
      onDone: () => setIsTyping(false),
      onError: (err) => {
        console.error("Greeting error:", err);
        setMessages([{ role: "assistant", content: `Hi! I'm your ${activePersona.emoji} ${activePersona.label} ${category.name}. How can I help?` }]);
        setIsTyping(false);
      },
    });
  }, [category, activePersona]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const handlePersonaSwitch = (persona: Persona) => {
    if (persona.id === activePersona?.id) return;
    setActivePersona(persona);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: `*switches to ${persona.emoji} ${persona.label} mode*\n\nAlright, let's continue. What were you saying?` },
    ]);
  };

  const handleScenarioSwitch = (scenario: Scenario | null) => {
    if (scenario?.id === activeScenario?.id) return;
    setActiveScenario(scenario);
    if (scenario) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `*Scene set: ${scenario.emoji} ${scenario.label}*\n\n${scenario.description}. Let's go — what would you like to say?` },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `*Scenario cleared* — we're back to a free conversation. What's on your mind?` },
      ]);
    }
  };

  const handleSend = async (text: string) => {
    const userMsg: Msg = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    if (checkSafety(text)) {
      setIsTyping(true);
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: "assistant", content: SAFETY_RESPONSE }]);
        setIsTyping(false);
      }, 400);
      return;
    }

    setIsTyping(true);
    const systemPrompt = buildSystemPrompt(
      category!.name,
      category!.basePrompt,
      activePersona,
      activeScenario,
    );

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && assistantSoFar.startsWith(last.content.slice(0, 20))) {
          return [...prev.slice(0, -1), { role: "assistant", content: assistantSoFar }];
        }
        return [...prev, { role: "assistant" as const, content: assistantSoFar }];
      });
    };

    await streamChat({
      messages: updatedMessages,
      systemPrompt,
      onDelta: upsert,
      onDone: () => setIsTyping(false),
      onError: (err) => {
        toast.error(err);
        setIsTyping(false);
      },
    });
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
          <p className="text-xs text-muted-foreground">
            Conversation practice{activeScenario ? ` · ${activeScenario.emoji} ${activeScenario.label}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">Safe</span>
        </div>
      </header>

      {activePersona && (
        <PersonaSelector
          personas={category.personas}
          activeId={activePersona.id}
          onSelect={handlePersonaSwitch}
        />
      )}

      {category && (
        <ScenarioSelector
          scenarios={category.scenarios}
          activeId={activeScenario?.id || null}
          onSelect={handleScenarioSwitch}
        />
      )}

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
          {isTyping && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <ChatInput onSend={handleSend} disabled={isTyping} />
      </div>
    </div>
  );
};

export default Chat;
