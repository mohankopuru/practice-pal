import { motion } from "framer-motion";

export interface ResponseStyle {
  emotionalTone: string;
  communicationStyle: string;
}

const EMOTIONAL_TONES = [
  { id: "calm", label: "Calm", emoji: "😌" },
  { id: "neutral", label: "Neutral", emoji: "😐" },
  { id: "intense", label: "Intense", emoji: "🔥" },
  { id: "anxious", label: "Anxious", emoji: "😰" },
  { id: "cheerful", label: "Cheerful", emoji: "😄" },
];

const COMMUNICATION_STYLES = [
  { id: "direct", label: "Direct", emoji: "🎯" },
  { id: "passive", label: "Passive", emoji: "🤷" },
  { id: "empathetic", label: "Empathetic", emoji: "💛" },
  { id: "confrontational", label: "Confrontational", emoji: "⚡" },
  { id: "diplomatic", label: "Diplomatic", emoji: "🤝" },
];

interface ResponseStyleSelectorProps {
  style: ResponseStyle;
  onChange: (style: ResponseStyle) => void;
}

const Pill = ({
  item,
  isActive,
  layoutId,
  onClick,
}: {
  item: { id: string; label: string; emoji: string };
  isActive: boolean;
  layoutId: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`relative shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
      isActive ? "text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
    }`}
  >
    {isActive && (
      <motion.div
        layoutId={layoutId}
        className="absolute inset-0 rounded-full bg-primary"
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    )}
    <span className="relative z-10 flex items-center gap-1">
      <span>{item.emoji}</span>
      <span>{item.label}</span>
    </span>
  </button>
);

const ResponseStyleSelector = ({ style, onChange }: ResponseStyleSelectorProps) => {
  return (
    <div className="flex flex-col gap-1.5 border-b border-border bg-card/40 px-4 py-2">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <span className="shrink-0 text-xs font-medium text-muted-foreground mr-1">Tone:</span>
        {EMOTIONAL_TONES.map((t) => (
          <Pill
            key={t.id}
            item={t}
            isActive={style.emotionalTone === t.id}
            layoutId="tone-pill"
            onClick={() => onChange({ ...style, emotionalTone: t.id })}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <span className="shrink-0 text-xs font-medium text-muted-foreground mr-1">Style:</span>
        {COMMUNICATION_STYLES.map((s) => (
          <Pill
            key={s.id}
            item={s}
            isActive={style.communicationStyle === s.id}
            layoutId="style-pill"
            onClick={() => onChange({ ...style, communicationStyle: s.id })}
          />
        ))}
      </div>
    </div>
  );
};

export default ResponseStyleSelector;
