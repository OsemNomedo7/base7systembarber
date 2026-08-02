/* Card de depoimento - usado no slider horizontal de avaliações da Home */
import StarRating from "@/components/StarRating";
import type { Testimonial } from "@/types/barber";

interface TestimonialCardProps {
  testimonial: Testimonial;
  className?: string;
}

const TestimonialCard = ({ testimonial, className = "" }: TestimonialCardProps) => (
  <div className={`w-80 shrink-0 snap-start rounded-lg border border-border bg-card p-6 ${className}`}>
    <span className="font-display text-5xl italic leading-none text-primary/40">&ldquo;</span>
    {testimonial.comment && (
      <p className="-mt-3 font-display text-lg italic leading-snug">{testimonial.comment}</p>
    )}
    <div className="mt-5 flex items-center justify-between">
      <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
        {testimonial.customer_name}
      </span>
      <StarRating value={testimonial.rating} size={12} />
    </div>
  </div>
);

export default TestimonialCard;
