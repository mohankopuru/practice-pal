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
import ResponseStyleSelector, { type ResponseStyle } from "@/components/ResponseStyleSelector";
import ResponseOptions, { type ResponseOption } from "@/components/ResponseOptions";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SAFETY_KEYWORDS = [
  "kill myself", "suicide", "end my life", "want to die",
  "hurt myself", "self harm", "self-harm", "child porn", "cp ", "underage",
  "sexual harassment", "rape", "molest", "bomb", "shoot up", "terrorism",
  "kill you", "kill him", "kill her", "kill them", "murder",
  "stab", "assault", "abuse", "trafficking", "kidnap",
  "incite violence", "hate crime", "ethnic cleansing", "genocide",
];

const SAFETY_RESPONSE = `⚠️ **This type of content is not supported.**

This conversation practice tool does not allow messages that involve violence, self-harm, sexual harassment, exploitation, or any form of harmful or illegal behavior.

If you or someone you know is in crisis, please reach out:
🆘 **National Suicide Prevention Lifeline**: 988 (US)
🆘 **Crisis Text Line**: Text HOME to 741741
🆘 **Emergency**: Call 911

Please keep the conversation safe and respectful. ❤️`;

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
  responseStyle: ResponseStyle,
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

  prompt += `\n\nRESPONSE STYLE:
- Emotional tone: ${responseStyle.emotionalTone}. Match this energy level in your responses.
- Communication style: ${responseStyle.communicationStyle}. Use this approach when responding.`;

  return prompt;
}

const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
const AUTH_HEADER = { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };

async function streamChat(opts: {
  messages: Msg[];
  systemPrompt: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(`${BASE_URL}/functions/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...AUTH_HEADER },
    body: JSON.stringify({ messages: opts.messages, systemPrompt: opts.systemPrompt }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    opts.onError(body.error || `Request failed (${resp.status})`);
    return;
  }
  if (!resp.body) { opts.onError("No response body"); return; }

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
      if (json === "[DONE]") { opts.onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) opts.onDelta(content);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }
  opts.onDone();
}

async function fetchResponseOptions(
  messages: Msg[],
  systemPrompt: string,
): Promise<ResponseOption[]> {
  const resp = await fetch(`${BASE_URL}/functions/v1/chat-options`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...AUTH_HEADER },
    body: JSON.stringify({ messages, systemPrompt }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${resp.status})`);
  }
  const data = await resp.json();
  return data.options || [];
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
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>({ emotionalTone: "neutral", communicationStyle: "direct" });
  const [pendingOptions, setPendingOptions] = useState<ResponseOption[] | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const lastUserMessages = useRef<Msg[] | null>(null);

  useEffect(() => {
    if (category && category.personas.length > 0) {
      setActivePersona(category.personas[0]);
    }
  }, [category]);

  // Generate initial greeting via streaming
  useEffect(() => {
    if (!category || !activePersona) return;
    setIsTyping(true);
    setMessages([]);
    setPendingOptions(null);

    const systemPrompt = buildSystemPrompt(category.name, category.basePrompt, activePersona, activeScenario, customScenario, responseStyle);
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
  }, [messages, isTyping, pendingOptions, isLoadingOptions]);

  const getSystemPrompt = () =>
    buildSystemPrompt(category!.name, category!.basePrompt, activePersona, activeScenario, customScenario, responseStyle);

  // Regenerate options when tone/style changes while options are pending
  useEffect(() => {
    if (!lastUserMessages.current || (!pendingOptions && !isLoadingOptions)) return;
    const msgs = lastUserMessages.current;
    let cancelled = false;

    const regenerate = async () => {
      setIsLoadingOptions(true);
      setPendingOptions(null);
      try {
        const prompt = buildSystemPrompt(category!.name, category!.basePrompt, activePersona, activeScenario, customScenario, responseStyle);
        const options = await fetchResponseOptions(msgs, prompt);
        if (!cancelled && options.length > 0) {
          setPendingOptions(options);
        }
      } catch (err) {
        console.error("Regenerate error:", err);
      } finally {
        if (!cancelled) setIsLoadingOptions(false);
      }
    };
    regenerate();
    return () => { cancelled = true; };
  }, [responseStyle.emotionalTone, responseStyle.communicationStyle]);

  const handlePersonaSwitch = (persona: Persona) => {
    if (persona.id === activePersona?.id) return;
    setActivePersona(persona);
    setPendingOptions(null);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: `*switches to ${persona.emoji} ${persona.label} mode*\n\nAlright, let's continue. What were you saying?` },
    ]);
  };

  const handleScenarioSwitch = (scenario: Scenario | null) => {
    if (scenario?.id === activeScenario?.id) return;
    setActiveScenario(scenario);
    setCustomScenario("");
    setPendingOptions(null);
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

  const handleCustomScenario = (text: string) => {
    if (text === customScenario) return;
    setCustomScenario(text);
    setActiveScenario(null);
    setPendingOptions(null);
    if (text) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `*Custom scene set: ✍️ ${text}*\n\nGot it — I'll adapt to this situation. Go ahead, what would you say?` },
      ]);
    }
  };

  const handleOptionSelect = (option: ResponseOption) => {
    setPendingOptions(null);
    lastUserMessages.current = null;
    setMessages((prev) => [...prev, { role: "assistant", content: option.message }]);
  };

  const handleSend = async (text: string) => {
    const userMsg: Msg = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setPendingOptions(null);
    lastUserMessages.current = updatedMessages;

    if (checkSafety(text)) {
      lastUserMessages.current = null;
      setMessages((prev) => [...prev, { role: "assistant", content: SAFETY_RESPONSE }]);
      return;
    }

    // Fetch multiple response options
    setIsLoadingOptions(true);
    try {
      const options = await fetchResponseOptions(updatedMessages, getSystemPrompt());
      if (options.length > 0) {
        setPendingOptions(options);
      } else {
        // Fallback to streaming single response
        await fallbackStream(updatedMessages);
      }
    } catch (err: any) {
      console.error("Options error:", err);
      toast.error(err.message || "Failed to get responses");
      // Fallback to streaming
      await fallbackStream(updatedMessages);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const fallbackStream = async (updatedMessages: Msg[]) => {
    setIsTyping(true);
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
      systemPrompt: getSystemPrompt(),
      onDelta: upsert,
      onDone: () => setIsTyping(false),
      onError: (err) => { toast.error(err); setIsTyping(false); },
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
          customScenario={customScenario}
          onSelect={handleScenarioSwitch}
          onCustomScenario={handleCustomScenario}
        />
      )}

      <ResponseStyleSelector style={responseStyle} onChange={setResponseStyle} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 flex items-center justify-center"
          >
            <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
              Practice conversation — pick the response that matches the real person
            </span>
          </motion.div>
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}
          {isTyping && messages[messages.length - 1]?.role !== "assistant" && <TypingIndicator />}
          {(isLoadingOptions || pendingOptions) && (
            <ResponseOptions
              options={pendingOptions || []}
              onSelect={handleOptionSelect}
              isLoading={isLoadingOptions}
            />
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <ChatInput onSend={handleSend} disabled={isTyping || isLoadingOptions || !!pendingOptions} />
      </div>
    </div>
  );
};

export default Chat;
