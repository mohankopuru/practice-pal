import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { categories } from "@/data/categories";
import CategoryCard from "@/components/CategoryCard";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <MessageCircle className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">PracticePal</h1>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-12 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            Practice any conversation,<br />
            <span className="text-primary">before it matters.</span>
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Choose a scenario below and start a realistic conversation. Build confidence for job interviews, tough talks, or everyday interactions.
          </p>
        </motion.div>
      </section>

      {/* Categories Grid */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, i) => (
            <CategoryCard key={cat.id} category={cat} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Index;
