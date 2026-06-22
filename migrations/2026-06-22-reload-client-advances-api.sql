GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.client_advances TO authenticated;
GRANT ALL ON TABLE public.client_advances TO service_role;

SELECT pg_notify('pgrst', 'reload schema');
NOTIFY pgrst, 'reload schema';
