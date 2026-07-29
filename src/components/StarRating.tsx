/* Exibição de nota em estrelas - somente leitura */
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  size?: number;
  className?: string;
}

const StarRating = ({ value, size = 16, className = "" }: StarRatingProps) => (
  <div className={`flex items-center gap-0.5 ${className}`}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={size}
        className={star <= Math.round(value) ? "text-primary fill-primary" : "text-muted-foreground/30"}
      />
    ))}
  </div>
);

export default StarRating;
