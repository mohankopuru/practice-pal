import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Pencil, Send } from "lucide-react";
import type { Scenario } from "@/data/categories";

interface ScenarioSelectorProps {
  scenarios: Scenario[];
  activeId: string | null;
  customScenario: string;
  onSelect: (scenario: Scenario | null) => void;
  onCustomScenario: (text: string) => void;
}

const ScenarioSelector = ({ scenarios, activeId, customScenario, onSelect, onCustomScenario }: ScenarioSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const active = scenarios.find((s) => s.id === activeId);
  const isCustomActive = !active && !!customScenario;

  useEffect(() => {
    if (showCustomInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCustomInput]);

  const handleSubmitCustom = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onCustomScenario(trimmed);
    setDraft("");
    setShowCustomInput(false);
    setIsOpen(false);
  };

  const displayLabel = active
    ? `${active.emoji} ${active.label}`
    : isCustomActive
      ? `✍️ ${customScenario.length > 40 ? customScenario.slice(0, 40) + "…" : customScenario}`
      : null;

  return (
    <div className="border-b border-border bg-card/40 px-4 py-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm transition-colors hover:bg-secondary"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Scenario:</span>
          {displayLabel ? (
            <span className="font-medium text-foreground truncate">{displayLabel}</span>
          ) : (
            <span className="text-muted-foreground">Free conversation (tap to set a scene)</span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid gap-1.5 pt-2 pb-1">
              {(active || isCustomActive) && (
                <button
                  onClick={() => { onSelect(null); onCustomScenario(""); setIsOpen(false); }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <span>✖️</span>
                  <span>Clear scenario (free conversation)</span>
                </button>
              )}

              {/* Custom scenario button / input */}
              {!showCustomInput ? (
                <button
                  onClick={() => { setShowCustomInput(true); setDraft(customScenario || ""); }}
                  className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    isCustomActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <Pencil className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-medium">Describe your own scenario</div>
                    <div className="text-xs text-muted-foreground">
                      {isCustomActive ? customScenario : "Type a custom situation for the agent to roleplay"}
                    </div>
                  </div>
                </button>
              ) : (
                <div className="rounded-lg border border-border bg-background p-2">
                  <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitCustom();
                      }
                    }}
                    placeholder="e.g. I need to tell my boss I made a mistake on the quarterly report and a client noticed…"
                    className="w-full resize-none rounded-md bg-transparent p-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    rows={3}
                  />
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setShowCustomInput(false)}
                      className="rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitCustom}
                      disabled={!draft.trim()}
                      className="flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-40 transition-colors"
                    >
                      <Send className="h-3 w-3" />
                      Set scene
                    </button>
                  </div>
                </div>
              )}

              {/* Preset scenarios */}
              {scenarios.map((s) => {
                const isActive = s.id === activeId;
                return (
                  <button
                    key={s.id}
                    onClick={() => { onSelect(s); onCustomScenario(""); setShowCustomInput(false); setIsOpen(false); }}
                    className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span className="mt-0.5 text-base">{s.emoji}</span>
                    <div>
                      <div className="font-medium">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScenarioSelector;
