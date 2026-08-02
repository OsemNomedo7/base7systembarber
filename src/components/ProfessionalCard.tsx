/* Retrato editorial de um profissional. CTA leva pro agendamento já com o
 * profissional pré-selecionado (seção 37 do prompt). */
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { PublicProfessional } from "@/types/barber";

interface ProfessionalCardProps {
  professional: PublicProfessional;
  className?: string;
}

const ProfessionalCard = ({ professional, className = "" }: ProfessionalCardProps) => (
  <Link
    to={`/agendar?professional=${professional.id}`}
    className={`group relative block overflow-hidden rounded-lg bg-card ${className}`}
  >
    <div className="aspect-[3/4] overflow-hidden bg-secondary">
      {professional.photo ? (
        <img
          src={professional.photo}
          alt={professional.name}
          className="h-full w-full object-cover grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-display text-6xl text-muted-foreground">
          {professional.name.charAt(0)}
        </div>
      )}
    </div>
    <div className="p-5">
      <h3 className="font-display text-xl font-semibold">{professional.name}</h3>
      {professional.bio && (
        <p className="mt-1 font-mono text-xs uppercase tracking-wide text-muted-foreground line-clamp-1">
          {professional.bio}
        </p>
      )}
      <span className="mt-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-primary">
        Agendar com este barbeiro
        <ArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </div>
  </Link>
);

export default ProfessionalCard;
