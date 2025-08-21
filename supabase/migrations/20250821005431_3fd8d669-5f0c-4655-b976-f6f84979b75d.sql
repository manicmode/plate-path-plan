-- Fix: Revoke INSERT permissions for authenticated users on sensitive tables
REVOKE INSERT ON public.challenge_order FROM authenticated;
REVOKE INSERT ON public.affiliate_click FROM authenticated;  
REVOKE INSERT ON public.affiliate_conversion FROM authenticated;
REVOKE INSERT ON public.affiliate_program FROM authenticated;

-- Double-check by revoking UPDATE/DELETE too (should only be service_role)
REVOKE UPDATE, DELETE ON public.challenge_order FROM authenticated;
REVOKE UPDATE, DELETE ON public.affiliate_click FROM authenticated;
REVOKE UPDATE, DELETE ON public.affiliate_conversion FROM authenticated;
REVOKE UPDATE, DELETE ON public.affiliate_program FROM authenticated;