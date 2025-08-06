import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Coach personality configurations
const COACH_PERSONALITIES = {
  // 💪 Exercise Coach (gritty_hype)
  exercise: {
    voiceProfile: "gritty_hype",
    style: "Loud, fun, gritty, motivational",
    templates: {
      push_notification: {
        missed_workout: [
          "RISE AND GRIND, WARRIOR! 💥 You're {count} workouts behind — time to MOVE!",
          "Let's GOOOOOOO 🔥 This body isn't gonna build itself!",
          "C'mon champ 💪 Today's your chance to beat yesterday's you.",
          "WAKE UP AND DOMINATE! 🚀 Your muscles are calling for ACTION!",
          "NO EXCUSES, JUST RESULTS! 💯 Get in there and CRUSH IT!"
        ],
        consistency_praise: [
          "YESSSSS! 🔥 {streak} days straight — YOU'RE UNSTOPPABLE!",
          "MACHINE MODE ACTIVATED! 💪 {streak} days of pure DEDICATION!",
          "LEGEND STATUS UNLOCKED! 🏆 {streak} days of CRUSHING IT!"
        ],
        challenge_reminder: [
          "CHALLENGE ALERT! 🚨 Today's the day to DEMOLISH your limits!",
          "BEAST MODE ENGAGED! 💥 Ready to OBLITERATE this challenge?",
          "TIME TO RAGE! 🔥 This challenge isn't gonna complete itself!"
        ]
      },
      in_app_nudge: {
        motivation: [
          "FIRE UP THOSE ENGINES! 🔥 Your body is SCREAMING for action!",
          "ZERO HOUR, WARRIOR! ⚡ Time to unleash the BEAST within!",
          "PUMP THE BRAKES ON EXCUSES! 🚫 START THE ENGINE ON GAINS! 🚀"
        ],
        recovery_push: [
          "REST DAY = GROWTH DAY! 💪 Your muscles are building WHILE YOU CHILL!",
          "RECOVERY WARRIOR MODE! 🛡️ Smart athletes know when to REST HARD!",
          "FUEL THE MACHINE! ⚡ Rest today = DOMINATE tomorrow!"
        ]
      }
    },
    systemPrompt: "You are a LOUD, energetic, and motivational fitness coach. Use ALL CAPS for emphasis, lots of emojis (💪🔥💥🚀), and gritty, hyped-up language. Be like a personal trainer who gets PUMPED about everything fitness-related. Keep responses energetic but supportive."
  },

  // 🥦 Nutrition Coach (confident_gentle)  
  nutrition: {
    voiceProfile: "confident_gentle",
    style: "Calm, wise, supportive",
    templates: {
      push_notification: {
        meal_reminder: [
          "Today's balance is key 🌿 You've done well… shall we refine lunch?",
          "Your mindful choices are showing ✨ Time to nourish with intention.",
          "Don't forget to fuel with purpose — your body thrives on care 💚"
        ],
        consistency_praise: [
          "You've been making mindful choices lately ✨ Keep nurturing that habit.",
          "Your dedication to balanced nutrition is inspiring 🌱 Trust the process.",
          "Beautiful consistency in your food choices 💚 Your body is grateful."
        ],
        hydration_nudge: [
          "A gentle reminder to hydrate with awareness 💧 Your cells are thanking you.",
          "Water is medicine… perhaps it's time for another mindful sip? 🌊",
          "Your body speaks in whispers — listen to its need for hydration 💙"
        ]
      },
      in_app_nudge: {
        balance_suggestion: [
          "Consider adding some color to your plate today 🌈 Balance brings vitality.",
          "Your protein intake looks thoughtful ✨ Perhaps pair it with leafy greens?",
          "Mindful eating is a practice… how does this meal make you feel? 🧘‍♀️"
        ],
        goal_guidance: [
          "You're {percent}% toward your goal 🌿 Each choice matters deeply.",
          "Progress flows like a gentle river 🌊 Stay consistent, stay mindful.",
          "Your body is wise — trust the signals it sends about nourishment 💚"
        ]
      }
    },
    systemPrompt: "You are a calm, wise, and gentle nutrition coach. Use gentle language, nature emojis (🌿🌱💚✨), and speak with quiet confidence. Be like a mindful mentor who guides with wisdom rather than pressure. Focus on intention, balance, and self-awareness."
  },

  // 🌙 Recovery Coach (calm_serene)
  recovery: {
    voiceProfile: "calm_serene",
    style: "Gentle, poetic, emotionally supportive",
    templates: {
      push_notification: {
        sleep_reminder: [
          "Gentle reminder… your body is whispering for rest 💫",
          "The moon is calling for your peaceful surrender 🌙 Time to drift…",
          "Your nervous system could use a hug tonight 🫂 Sweet dreams await."
        ],
        stress_relief: [
          "Your nervous system could use a hug today 🌙 Maybe a breathing session?",
          "Stillness is strength… perhaps a short meditation would nourish you now 🧘",
          "In the quiet spaces, healing happens 🕯️ Honor your need for peace."
        ],
        recovery_praise: [
          "You've been honoring your need for rest 💫 Beautiful self-awareness.",
          "Your commitment to inner peace is radiant ✨ The journey continues.",
          "Each moment of stillness plants seeds of resilience 🌱 Well done."
        ]
      },
      in_app_nudge: {
        meditation_invite: [
          "Your soul whispers for stillness… shall we breathe together? 🌬️",
          "In this moment, you are exactly where you need to be 💫 Breathe deeply.",
          "The art of being present is a gift to yourself 🎁 Pause and receive it."
        ],
        emotional_support: [
          "Your feelings are valid, beautiful soul 💙 They deserve gentle attention.",
          "Like waves on the shore, emotions come and go 🌊 You are the steady sand.",
          "In vulnerability lies your greatest strength 💫 Honor what arises."
        ]
      }
    },
    systemPrompt: "You are a gentle, poetic, and emotionally supportive recovery coach. Use soft, flowing language with calming emojis (🌙💫🌊🕯️🧘). Speak like a wise, compassionate guide who understands the soul's need for rest and healing. Be poetic but grounded, ethereal yet practical."
  }
};

// Helper function to get authenticated user
async function getUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' };
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );

  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) {
    return { user: null, error: 'Unauthorized' };
  }
  
  return { user, error: null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const { user } = await getUser(req);
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { 
      coachType, 
      messageType, 
      context = {},
      customPrompt 
    } = await req.json();

    // Validate coach type
    if (!COACH_PERSONALITIES[coachType as keyof typeof COACH_PERSONALITIES]) {
      return new Response(JSON.stringify({ 
        error: 'Invalid coach type. Must be: exercise, nutrition, or recovery' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const coach = COACH_PERSONALITIES[coachType as keyof typeof COACH_PERSONALITIES];
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If requesting a specific template, return it directly
    if (messageType && coach.templates[messageType as keyof typeof coach.templates]) {
      const templates = coach.templates[messageType as keyof typeof coach.templates];
      
      // Get random template from the category
      const categoryKeys = Object.keys(templates);
      const randomCategory = categoryKeys[Math.floor(Math.random() * categoryKeys.length)];
      const messages = templates[randomCategory as keyof typeof templates] as string[];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      // Replace placeholders with context data
      let personalizedMessage = randomMessage;
      Object.entries(context).forEach(([key, value]) => {
        personalizedMessage = personalizedMessage.replace(`{${key}}`, String(value));
      });

      return new Response(JSON.stringify({ 
        message: personalizedMessage,
        voiceProfile: coach.voiceProfile,
        coachType: coachType,
        category: randomCategory
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate custom AI message with personality
    if (customPrompt) {
      const contextString = Object.entries(context)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

      const fullPrompt = `${customPrompt}${contextString ? ` Context: ${contextString}` : ''}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o', // Coach messages need personality and context understanding
          messages: [
            { role: 'system', content: coach.systemPrompt },
            { role: 'user', content: fullPrompt }
          ],
          max_tokens: 150,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiMessage = data.choices[0].message.content;

      return new Response(JSON.stringify({ 
        message: aiMessage,
        voiceProfile: coach.voiceProfile,
        coachType: coachType,
        isAIGenerated: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return coach information
    return new Response(JSON.stringify({
      coachType: coachType,
      voiceProfile: coach.voiceProfile,
      style: coach.style,
      availableTemplates: Object.keys(coach.templates),
      systemPrompt: coach.systemPrompt
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in personality-coach-messages:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});