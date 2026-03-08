import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Category } from "@/data/categories";

interface CategoryCardProps {
  category: Category;
  index: number;
}

const CategoryCard = ({ category, index }: CategoryCardProps) => {
  const navigate = useNavigate();
  const Icon = category.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/chat/${category.id}`)}
      className="group flex flex-col items-start gap-4 rounded-2xl bg-card p-6 text-left shadow-card transition-shadow hover:shadow-soft"
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: category.color + "18", color: category.color }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="font-display text-lg font-semibold text-foreground">
          {category.name}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {category.description}
        </p>
      </div>
    </motion.button>
  );
};

export default CategoryCard;
