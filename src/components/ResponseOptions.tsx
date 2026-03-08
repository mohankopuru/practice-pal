import { motion } from "framer-motion";

export interface ResponseOption {
  label: string;
  emoji: string;
  message: string;
}

interface ResponseOptionsProps {
  options: ResponseOption[];
  onSelect: (option: ResponseOption) => void;
  isLoading?: boolean;
}

const ResponseOptions = ({ options, onSelect, isLoading }: ResponseOptionsProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[90%] space-y-2">
          <p className="text-xs font-medium text-muted-foreground px-1 mb-2">
            ✨ Generating possible responses…
          </p>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-border bg-card/60 p-3"
            >
              <div className="h-3 w-24 rounded bg-muted mb-2" />
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-3/4 rounded bg-muted mt-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-2">
        <p className="text-xs font-medium text-muted-foreground px-1 mb-2">
          🎭 Pick the response that best matches how this person would react:
        </p>
        {options.map((opt, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.25 }}
            onClick={() => onSelect(opt)}
            className="group block w-full rounded-xl border border-border bg-card/80 p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-base">{opt.emoji}</span>
              <span className="text-xs font-semibold text-primary">{opt.label}</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{opt.message}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default ResponseOptions;
