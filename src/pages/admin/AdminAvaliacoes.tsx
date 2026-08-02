/* Moderação de avaliações: de produtos (loja) e depoimentos (barbearia/atendimento) */
import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAdminReviews, useUpdateReviewStatus, useReplyToReview } from "@/hooks/useProductReviews";
import {
  useAdminTestimonials,
  useUpdateTestimonialStatus,
  useReplyToTestimonial,
} from "@/hooks/useTestimonials";
import type { ReviewStatus } from "@/types/db";
import type { TestimonialStatus } from "@/types/barber";
import StarRating from "@/components/StarRating";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};

interface ReplyBoxProps {
  initialReply: string | null;
  saving: boolean;
  onSave: (reply: string) => void;
}

const ReplyBox = ({ initialReply, saving, onSave }: ReplyBoxProps) => {
  const [reply, setReply] = useState(initialReply ?? "");

  return (
    <div className="mt-3 space-y-2">
      <Textarea
        rows={2}
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder="Responder publicamente..."
        className="text-sm"
      />
      <Button size="sm" variant="outline" onClick={() => onSave(reply)} disabled={saving}>
        {saving ? "Salvando..." : "Salvar resposta"}
      </Button>
    </div>
  );
};

const ProductReviewsPanel = () => {
  const { data: reviews = [], isLoading } = useAdminReviews();
  const updateStatus = useUpdateReviewStatus();
  const replyMutation = useReplyToReview();

  const pendentes = reviews.filter((r) => r.status === "pendente");
  const aprovadas = reviews.filter((r) => r.status === "aprovada");
  const rejeitadas = reviews.filter((r) => r.status === "rejeitada");

  const renderList = (list: typeof reviews) => {
    if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
    if (list.length === 0) return <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma avaliação aqui.</p>;

    return (
      <div className="space-y-4">
        {list.map((review) => (
          <div key={review.id} className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-primary font-medium uppercase tracking-wide mb-1">
                  {review.product_name ?? "Produto removido"}
                </p>
                <p className="font-medium text-sm">{review.customer_name}</p>
                <StarRating value={review.rating} size={14} className="my-1.5" />
                {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(review.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={review.status === "aprovada" ? "default" : "secondary"}>
                  {STATUS_LABELS[review.status]}
                </Badge>
                {review.status !== "aprovada" && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 text-green-600 hover:text-green-700"
                    onClick={() => updateStatus.mutate({ id: review.id, status: "aprovada" })}
                    aria-label="Aprovar"
                  >
                    <Check size={16} />
                  </Button>
                )}
                {review.status !== "rejeitada" && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => updateStatus.mutate({ id: review.id, status: "rejeitada" })}
                    aria-label="Rejeitar"
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
            </div>
            <ReplyBox
              initialReply={review.admin_reply}
              saving={replyMutation.isPending}
              onSave={(admin_reply) =>
                replyMutation.mutate(
                  { id: review.id, admin_reply },
                  {
                    onSuccess: () => toast.success("Resposta salva."),
                    onError: () => toast.error("Falha ao salvar resposta."),
                  }
                )
              }
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <Tabs defaultValue="pendentes">
      <TabsList>
        <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
        <TabsTrigger value="aprovadas">Aprovadas ({aprovadas.length})</TabsTrigger>
        <TabsTrigger value="rejeitadas">Rejeitadas ({rejeitadas.length})</TabsTrigger>
        <TabsTrigger value="todas">Todas ({reviews.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="pendentes" className="mt-6">{renderList(pendentes)}</TabsContent>
      <TabsContent value="aprovadas" className="mt-6">{renderList(aprovadas)}</TabsContent>
      <TabsContent value="rejeitadas" className="mt-6">{renderList(rejeitadas)}</TabsContent>
      <TabsContent value="todas" className="mt-6">{renderList(reviews)}</TabsContent>
    </Tabs>
  );
};

const TESTIMONIAL_STATUS_LABELS: Record<TestimonialStatus, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
};

const TestimonialsPanel = () => {
  const { data: testimonials = [], isLoading } = useAdminTestimonials();
  const updateStatus = useUpdateTestimonialStatus();
  const replyMutation = useReplyToTestimonial();

  const pendentes = testimonials.filter((t) => t.status === "pendente");
  const aprovadas = testimonials.filter((t) => t.status === "aprovada");
  const rejeitadas = testimonials.filter((t) => t.status === "rejeitada");

  const renderList = (list: typeof testimonials) => {
    if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
    if (list.length === 0) return <p className="text-sm text-muted-foreground py-6 text-center">Nenhum depoimento aqui.</p>;

    return (
      <div className="space-y-4">
        {list.map((testimonial) => (
          <div key={testimonial.id} className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                {testimonial.professional_name && (
                  <p className="text-xs text-primary font-medium uppercase tracking-wide mb-1">
                    {testimonial.professional_name}
                  </p>
                )}
                <p className="font-medium text-sm">{testimonial.customer_name}</p>
                <StarRating value={testimonial.rating} size={14} className="my-1.5" />
                {testimonial.comment && <p className="text-sm text-muted-foreground">{testimonial.comment}</p>}
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(testimonial.created_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={testimonial.status === "aprovada" ? "default" : "secondary"}>
                  {TESTIMONIAL_STATUS_LABELS[testimonial.status]}
                </Badge>
                {testimonial.status !== "aprovada" && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 text-green-600 hover:text-green-700"
                    onClick={() => updateStatus.mutate({ id: testimonial.id, status: "aprovada" })}
                    aria-label="Aprovar"
                  >
                    <Check size={16} />
                  </Button>
                )}
                {testimonial.status !== "rejeitada" && (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => updateStatus.mutate({ id: testimonial.id, status: "rejeitada" })}
                    aria-label="Rejeitar"
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>
            </div>
            <ReplyBox
              initialReply={testimonial.admin_reply}
              saving={replyMutation.isPending}
              onSave={(admin_reply) =>
                replyMutation.mutate(
                  { id: testimonial.id, admin_reply },
                  {
                    onSuccess: () => toast.success("Resposta salva."),
                    onError: () => toast.error("Falha ao salvar resposta."),
                  }
                )
              }
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <Tabs defaultValue="pendentes">
      <TabsList>
        <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
        <TabsTrigger value="aprovadas">Aprovadas ({aprovadas.length})</TabsTrigger>
        <TabsTrigger value="rejeitadas">Rejeitadas ({rejeitadas.length})</TabsTrigger>
        <TabsTrigger value="todas">Todas ({testimonials.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="pendentes" className="mt-6">{renderList(pendentes)}</TabsContent>
      <TabsContent value="aprovadas" className="mt-6">{renderList(aprovadas)}</TabsContent>
      <TabsContent value="rejeitadas" className="mt-6">{renderList(rejeitadas)}</TabsContent>
      <TabsContent value="todas" className="mt-6">{renderList(testimonials)}</TabsContent>
    </Tabs>
  );
};

const AdminAvaliacoes = () => {
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold mb-6">Avaliações</h1>

      <Tabs defaultValue="depoimentos">
        <TabsList>
          <TabsTrigger value="depoimentos">Depoimentos</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
        </TabsList>
        <TabsContent value="depoimentos" className="mt-6">
          <TestimonialsPanel />
        </TabsContent>
        <TabsContent value="produtos" className="mt-6">
          <ProductReviewsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAvaliacoes;
