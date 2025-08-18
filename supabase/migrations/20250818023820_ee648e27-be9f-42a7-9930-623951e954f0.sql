-- Seed Perplexity habits into public.habit_template via RPC
-- Back-compatible; uses SECURITY DEFINER function.

DO $$
DECLARE
  v_payload jsonb;
BEGIN
  v_payload := '[
  {
    "slug": "5-servings-veggies-fruits",
    "name": "Eat Five Servings of Veggies and Fruits",
    "domain": "nutrition",
    "category": "veggies-fruits",
    "summary": "Boosts heart health and reduces disease risk.",
    "goal_type": "count",
    "default_target": 5.0,
    "min_viable": "Eat one extra serving of vegetables or fruits today.",
    "time_windows": [
      { "start": "07:00", "end": "22:00" }
    ],
    "suggested_rules": [
      { "type": "daily", "params": {} }
    ],
    "cues_and_stacking": "Add fruit to breakfast; add veggies to lunch or dinner.",
    "equipment": "",
    "contraindications": "",
    "difficulty": "easy",
    "estimated_minutes": 10,
    "coach_copy": null,
    "tags": "nutrition,produce,fruit,vegetables,heart-health",
    "sources": "Perplexity deep research"
  },
  {
    "slug": "2l-water",
    "name": "Drink ~2 Liters of Water",
    "domain": "nutrition",
    "category": "hydration",
    "summary": "Supports energy, focus, and recovery.",
    "goal_type": "count",
    "default_target": 8.0,
    "min_viable": "Drink one extra cup of water today.",
    "time_windows": [
      { "start": "07:00", "end": "22:00" }
    ],
    "suggested_rules": [
      { "type": "daily", "params": {} }
    ],
    "cues_and_stacking": "Keep a bottle on your desk; drink before each meal.",
    "equipment": "water bottle",
    "contraindications": "",
    "difficulty": "easy",
    "estimated_minutes": 0,
    "coach_copy": null,
    "tags": "hydration,water",
    "sources": "Perplexity deep research"
  },
  {
    "slug": "10k-steps",
    "name": "Walk 10,000 Steps",
    "domain": "exercise",
    "category": "daily-activity",
    "summary": "Improves cardiovascular fitness and overall health.",
    "goal_type": "count",
    "default_target": 10000.0,
    "min_viable": "Take a 5-minute walk after a meal.",
    "time_windows": [
      { "start": "07:00", "end": "22:00" }
    ],
    "suggested_rules": [
      { "type": "daily", "params": {} }
    ],
    "cues_and_stacking": "After breakfast; walk meetings.",
    "equipment": "walking shoes",
    "contraindications": "Consult a doctor if unable to walk safely. [cdc.gov]",
    "difficulty": "easy",
    "estimated_minutes": 30,
    "coach_copy": {
      "reminder_line": "Time for your daily walk!",
      "encourage_line": "Moving is winning! Nice job.",
      "reco_note": "Long-term consistency beats intensity."
    },
    "tags": "steps,walking,cardio,activity",
    "sources": "Perplexity deep research"
  },
  {
    "slug": "nsdr-10",
    "name": "Do 10 Minutes of NSDR",
    "domain": "recovery",
    "category": "restoration",
    "summary": "Non-Sleep Deep Rest boosts recovery and stress resilience.",
    "goal_type": "duration",
    "default_target": 10.0,
    "min_viable": "Do 2 minutes of guided breathing.",
    "time_windows": [
      { "start": "12:00", "end": "18:00" }
    ],
    "suggested_rules": [
      { "type": "daily", "params": {} }
    ],
    "cues_and_stacking": "Mid-day reset after lunch.",
    "equipment": "",
    "contraindications": "",
    "difficulty": "easy",
    "estimated_minutes": 10,
    "coach_copy": null,
    "tags": "nsdr,breathwork,relaxation,recovery",
    "sources": "Perplexity deep research"
  },
  {
    "slug": "lights-out-11",
    "name": "Lights Out by 11 PM",
    "domain": "recovery",
    "category": "sleep-hygiene",
    "summary": "Consistent bedtime supports deeper sleep and hormones.",
    "goal_type": "bool",
    "default_target": null,
    "min_viable": "Set a bedtime alarm 30 minutes before.",
    "time_windows": [
      { "start": "22:30", "end": "23:30" }
    ],
    "suggested_rules": [
      { "type": "daily", "params": {} }
    ],
    "cues_and_stacking": "Wind-down routine, dim lights, no screens.",
    "equipment": "",
    "contraindications": "",
    "difficulty": "medium",
    "estimated_minutes": 0,
    "coach_copy": null,
    "tags": "sleep,bedtime,circadian",
    "sources": "Perplexity deep research"
  },
  {
    "slug": "protein-breakfast",
    "name": "Eat a Protein-Forward Breakfast",
    "domain": "nutrition",
    "category": "breakfast",
    "summary": "Improves satiety and stabilizes energy.",
    "goal_type": "bool",
    "default_target": null,
    "min_viable": "Add a protein source to breakfast.",
    "time_windows": [
      { "start": "06:00", "end": "10:00" }
    ],
    "suggested_rules": [
      { "type": "daily", "params": {} }
    ],
    "cues_and_stacking": "Prep eggs/Greek yogurt ahead of time.",
    "equipment": "",
    "contraindications": "",
    "difficulty": "easy",
    "estimated_minutes": 10,
    "coach_copy": null,
    "tags": "protein,breakfast,satiety",
    "sources": "Perplexity deep research"
  }
]'::jsonb;
  
  PERFORM public.rpc_upsert_habit_templates(v_payload);
END;
$$;