import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { Scenario } from "@/data/categories";

interface ScenarioSelectorProps {
  scenarios: Scenario[];
  activeId: string | null;
  onSelect: (scenario: Scenario | null) => void;
}

const ScenarioSelector = ({ scenarios, activeId, onSelect }: ScenarioSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const active = scenarios.find((s) => s.id === activeId);

  return (
    <div className="border-b border-border bg-card/40 px-4 py-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm transition-colors hover:bg-secondary"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Scenario:</span>
          {active ? (
            <span className="font-medium text-foreground">
              {active.emoji} {active.label}
            </span>
          ) : (
            <span className="text-muted-foreground">Free conversation (tap to set a scene)</span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
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
              {active && (
                <button
                  onClick={() => { onSelect(null); setIsOpen(false); }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-secondary transition-colors"
                >
                  <span>✖️</span>
                  <span>Clear scenario (free conversation)</span>
                </button>
              )}
              {scenarios.map((s) => {
                const isActive = s.id === activeId;
                return (
                  <button
                    key={s.id}
                    onClick={() => { onSelect(s); setIsOpen(false); }}
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
