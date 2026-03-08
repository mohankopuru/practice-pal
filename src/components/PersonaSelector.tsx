import { motion, AnimatePresence } from "framer-motion";
import type { Persona } from "@/data/categories";

interface PersonaSelectorProps {
  personas: Persona[];
  activeId: string;
  onSelect: (persona: Persona) => void;
}

const PersonaSelector = ({ personas, activeId, onSelect }: PersonaSelectorProps) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 border-b border-border bg-card/60 backdrop-blur-sm scrollbar-none">
      <span className="shrink-0 text-xs font-medium text-muted-foreground mr-1">Mood:</span>
      {personas.map((p) => {
        const isActive = p.id === activeId;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className={`relative shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="persona-pill"
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1">
              <span>{p.emoji}</span>
              <span>{p.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default PersonaSelector;
