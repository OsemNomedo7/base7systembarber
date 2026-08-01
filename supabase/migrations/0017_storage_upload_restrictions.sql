-- 0017: correção SEC-008 do audit de segurança. A validação de tipo/tamanho
-- de arquivo no upload (ImageUploader.tsx) era só do lado do cliente - a
-- policy de RLS do bucket "media" checava apenas bucket_id + is_admin(), não
-- o tipo de conteúdo. Isso permitiria (a uma sessão admin já comprometida)
-- enviar qualquer tipo de arquivo pro bucket público. Restringe no próprio
-- bucket do Storage, que é onde o Supabase realmente valida antes de aceitar
-- o upload (defesa em profundidade além do `accept` do <input> no frontend).
update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'],
    file_size_limit = 5242880 -- 5MB, mesmo limite já usado no frontend
where id = 'media';
