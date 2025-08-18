
-- Quick patch: add a safe-unique exercise habit to correct counts
DO $do$
DECLARE
  v_payload jsonb := $json$
[
  {
    "slug": "jump-rope-60s-bh",
    "name": "Jump Rope (60s)",
    "domain": "exercise",
    "category": "cardio",
    "summary": "Quick cardio burst; great coordination and bone-loading stimulus.",
    "goal_type": "duration",
    "default_target": 1.0,
    "min_viable": "20 seconds or shadow jumps.",
    "time_windows": [{ "start": "07:00", "end": "18:00" }],
    "suggested_rules": [{ "type": "daily", "params": {} }],
    "cues_and_stacking": "Between tasks or before a shower.",
    "equipment": "jump rope (optional)",
    "contraindications": "Low impact alternative if joint pain.",
    "difficulty": "medium",
    "estimated_minutes": 1,
    "coach_copy": null,
    "tags": "cardio,plyo,bone",
    "sources": "User-provided PDF: Evidence-Based Biohacks"
  }
]
$json$::jsonb;
BEGIN
  PERFORM public.habit_template_upsert_many(payloads := v_payload);
END;
$do$;

-- Recheck totals and domain counts
SELECT COUNT(*) AS total FROM public.habit_templates;
SELECT domain, COUNT(*) AS count FROM public.habit_templates GROUP BY domain ORDER BY domain;

-- Confirm the new slug exists
SELECT slug, domain FROM public.habit_templates WHERE slug = 'jump-rope-60s-bh';
