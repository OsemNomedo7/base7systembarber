/* Upload de imagem única pro bucket "media" do Supabase Storage */
import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

const MAX_SIZE_MB = 5;

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  folder: "products" | "services" | "content";
  label?: string;
}

const ImageUploader = ({ value, onChange, folder, label = "Imagem" }: ImageUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Imagem muito grande (máx. ${MAX_SIZE_MB}MB).`);
      return;
    }

    setUploading(true);
    // Sanitiza o nome original (SEC-009): mantém só letras/números/._- para
    // não permitir que caracteres como "/" escapem do prefixo de pasta
    // pretendido dentro do bucket.
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from("media").upload(path, file);
    setUploading(false);

    if (error) {
      toast.error("Falha ao enviar imagem.");
      return;
    }

    const { data } = supabase.storage.from("media").getPublicUrl(path);
    onChange(data.publicUrl);
  };

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium block">{label}</span>
      {value ? (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-border">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/90 flex items-center justify-center hover:bg-background"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? "Enviando..." : "Enviar imagem"}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default ImageUploader;
