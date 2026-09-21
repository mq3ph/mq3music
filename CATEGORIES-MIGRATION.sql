-- ONE PostgreSQL statement: paste this entire DO block in Neon, then Run.
-- Atomic and safe to repeat. No lyrics, links, IDs or credits are modified.
DO $mq3_categories$
BEGIN
  ALTER TABLE public.songs DROP CONSTRAINT IF EXISTS songs_category_check;
  ALTER TABLE public.songs ADD CONSTRAINT songs_category_check
    CHECK (category IN ('NAME SONGS','INSPIRATIONAL SONGS','OPM','LOVE SONGS','ORIGINAL SONGS'));

  UPDATE public.songs SET category='OPM'
  WHERE category='ORIGINAL SONGS' AND id='60967b6d-c1a0-4ae6-8c5c-526d6cb5e1a1';

  UPDATE public.songs SET category='NAME SONGS'
  WHERE id='3e3cceb4-f3ee-45c3-89a9-be1ee6365167'
    AND category IN ('ORIGINAL SONGS','LOVE SONGS');

  UPDATE public.songs SET category='LOVE SONGS'
  WHERE category='ORIGINAL SONGS' AND id IN (
    'd04b7869-c286-45c0-b85f-9b04f23d77b8',
    'bdc295a8-d62b-46f2-946f-f503d127d28a'
  );
END
$mq3_categories$;
