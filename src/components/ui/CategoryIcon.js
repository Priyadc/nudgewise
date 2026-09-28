import {
  Briefcase,
  Car,
  CircleDashed,
  Clapperboard,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  Percent,
  Plane,
  Repeat,
  RotateCcw,
  Shield,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  Store,
  Utensils,
  Zap,
} from 'lucide-react';
import { categoryMeta } from '@/lib/categories';

const ICONS = {
  Briefcase,
  Car,
  CircleDashed,
  Clapperboard,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  Percent,
  Plane,
  Repeat,
  RotateCcw,
  Shield,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  Store,
  Utensils,
  Zap,
};

export default function CategoryIcon({ name, size = 38 }) {
  const meta = categoryMeta(name);
  const Icon = ICONS[meta.icon] || CircleDashed;
  return (
    <span className="cat-icon" style={{ width: size, height: size, background: `${meta.color}22`, color: meta.color }}>
      <Icon />
    </span>
  );
}
