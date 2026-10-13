-- Fix profile RLS so employees can read their managers' names and vice versa.

CREATE OR REPLACE FUNCTION public.is_manager_or_subordinate(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  me UUID := auth.uid();
BEGIN
  IF me IS NULL THEN RETURN FALSE; END IF;
  IF target_user_id = me THEN RETURN TRUE; END IF;

  -- Walk up from current user looking for target (target is my manager/ancestor)
  IF EXISTS (
    WITH RECURSIVE up AS (
      SELECT id, manager_id, 0 AS depth FROM public.profiles WHERE id = me
      UNION ALL
      SELECT p.id, p.manager_id, u.depth + 1
      FROM public.profiles p
      INNER JOIN up u ON p.id = u.manager_id
      WHERE u.depth < 10
    )
    SELECT 1 FROM up WHERE id = target_user_id
  ) THEN RETURN TRUE; END IF;

  -- Walk up from target looking for me (target is my subordinate)
  IF EXISTS (
    WITH RECURSIVE down AS (
      SELECT id, manager_id, 0 AS depth FROM public.profiles WHERE id = target_user_id
      UNION ALL
      SELECT p.id, p.manager_id, d.depth + 1
      FROM public.profiles p
      INNER JOIN down d ON p.id = d.manager_id
      WHERE d.depth < 10
    )
    SELECT 1 FROM down WHERE id = me
  ) THEN RETURN TRUE; END IF;

  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.is_manager_or_subordinate(UUID) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.is_manager_or_subordinate(UUID) TO authenticated;

DROP POLICY IF EXISTS profiles_select ON public.profiles;

CREATE POLICY profiles_select
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR (SELECT public.is_admin())
    OR (SELECT public.is_manager_or_subordinate(id))
  );
