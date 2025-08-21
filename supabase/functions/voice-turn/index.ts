import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Kill switch and environment checks
const checkVoiceCoachEnabled = (): boolean => {
  const enabled = Deno.env.get('VOICE_COACH_ENABLED');
  return enabled !== 'false';
};

// Initialize Supabase with service role for writes
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// OpenAI configuration
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

// System prompt for Voice Coach
const VOICE_COACH_SYSTEM_PROMPT = `You are a helpful health and wellness coach. You can analyze user progress, log health entries, set reminders, and create weekly plans.

Keep responses concise and actionable (≤150 words). Always end with 1-2 bullet points for next steps.

Available tools:
- analyze_progress: Review user's health data and trends
- log_entry: Record nutrition, exercise, or wellness entries
- set_reminder: Create timed reminders for health actions
- plan_week: Generate a weekly plan focused on specific goals

Focus on being encouraging and practical. Use insights from their data when available.`;

interface ToolCall {
  tool_name: string;
  arguments: any;
}

// Tool implementations (server-side only)
class VoiceCoachTools {
  constructor(private userId: string) {}

  async analyze_progress(params: { window?: string }): Promise<any> {
    console.log(`🔍 Analyzing progress for user ${this.userId}`, params);
    
    // Mock analysis for MVP - replace with actual data queries
    const insights = [
      "Your nutrition logging consistency improved 23% this month",
      "Exercise frequency is steady at 4.2 sessions per week"
    ];
    
    // Log audit entry
    await this.logAudit('analyze_progress', params);
    
    return {
      window: params.window || 'last_60_days',
      insights,
      summary: 'Overall progress is positive with room for hydration improvement'
    };
  }

  async log_entry(params: { type: string; value: number; unit?: string; note?: string }): Promise<any> {
    console.log(`📝 Logging entry for user ${this.userId}`, params);
    
    const entryId = crypto.randomUUID();
    
    // For MVP, simulate the logging - replace with actual table inserts
    // Example: Insert into nutrition_logs, exercise_logs, etc.
    
    await this.logAudit('log_entry', params);
    
    return {
      entry_id: entryId,
      type: params.type,
      value: params.value,
      unit: params.unit,
      logged_at: new Date().toISOString()
    };
  }

  async set_reminder(params: { title: string; schedule_iso: string }): Promise<any> {
    console.log(`⏰ Setting reminder for user ${this.userId}`, params);
    
    const reminderId = crypto.randomUUID();
    
    // For MVP, simulate reminder creation - replace with actual reminder system
    // Example: Insert into user_reminders or notifications table
    
    await this.logAudit('set_reminder', params);
    
    return {
      reminder_id: reminderId,
      title: params.title,
      scheduled_for: params.schedule_iso,
      created_at: new Date().toISOString()
    };
  }

  async plan_week(params: { focus: string }): Promise<any> {
    console.log(`📋 Planning week for user ${this.userId}`, params);
    
    // Mock weekly plan generation
    const plan = {
      focus: params.focus,
      weekly_goals: [
        `3 ${params.focus} sessions this week`,
        `Track daily progress in app`,
        `One recovery day mid-week`
      ]
    };
    
    await this.logAudit('plan_week', params);
    
    return plan;
  }

  private async logAudit(toolName: string, payload: any): Promise<void> {
    try {
      await supabase.from('voice_audit').insert({
        user_id: this.userId,
        action: toolName,
        tool_name: toolName,
        payload
      });
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      // Don't throw - audit logging shouldn't break the flow
    }
  }
}

// Convert base64 audio to proper format for OpenAI
const processAudioChunks = (base64String: string): Uint8Array => {
  const chunkSize = 32768;
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
};

// ASR - Audio to text
const transcribeAudio = async (audioData: Uint8Array): Promise<string> => {
  console.log('🎤 Starting ASR transcription...');
  const startTime = Date.now();
  
  const formData = new FormData();
  const blob = new Blob([audioData], { type: 'audio/webm' });
  formData.append('file', blob, 'audio.webm');
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`ASR API error: ${response.status} ${await response.text()}`);
  }

  const result = await response.json();
  const duration = Date.now() - startTime;
  console.log(`✅ ASR completed in ${duration}ms`);
  
  return result.text || '';
};

// LLM with function calling
const generateResponse = async (transcript: string, userId: string): Promise<{
  response_text: string;
  tool_calls: ToolCall[];
}> => {
  console.log('🧠 Starting LLM generation...');
  const startTime = Date.now();

  const tools = new VoiceCoachTools(userId);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { role: 'system', content: VOICE_COACH_SYSTEM_PROMPT },
        { role: 'user', content: transcript }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'analyze_progress',
            description: 'Analyze user health progress over a time window',
            parameters: {
              type: 'object',
              properties: {
                window: { 
                  type: 'string', 
                  enum: ['last_7_days', 'last_30_days', 'last_60_days'],
                  default: 'last_60_days'
                }
              }
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'log_entry',
            description: 'Log a health/wellness entry',
            parameters: {
              type: 'object',
              properties: {
                type: { type: 'string', description: 'Entry type (water, exercise, food, etc.)' },
                value: { type: 'number', description: 'Numeric value' },
                unit: { type: 'string', description: 'Unit of measurement' },
                note: { type: 'string', description: 'Optional note' }
              },
              required: ['type', 'value']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'set_reminder',
            description: 'Set a timed reminder',
            parameters: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Reminder title' },
                schedule_iso: { type: 'string', description: 'ISO datetime string' }
              },
              required: ['title', 'schedule_iso']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'plan_week',
            description: 'Generate a weekly plan',
            parameters: {
              type: 'object',
              properties: {
                focus: { type: 'string', description: 'Primary focus area' }
              },
              required: ['focus']
            }
          }
        }
      ],
      tool_choice: 'auto',
      max_completion_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status} ${await response.text()}`);
  }

  const result = await response.json();
  const duration = Date.now() - startTime;
  console.log(`✅ LLM completed in ${duration}ms`);

  const message = result.choices[0].message;
  let responseText = message.content || '';
  const toolCalls: ToolCall[] = [];

  // Execute tool calls
  if (message.tool_calls) {
    for (const toolCall of message.tool_calls) {
      const funcName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      try {
        console.log(`🔧 Executing tool: ${funcName}`, args);
        const result = await (tools as any)[funcName](args);
        toolCalls.push({
          tool_name: funcName,
          arguments: args,
          success: true,
          result
        });
        
        // Append tool execution confirmation to response
        responseText += `\n\n✓ ${funcName} completed successfully.`;
      } catch (error) {
        console.error(`❌ Tool execution failed: ${funcName}`, error);
        toolCalls.push({
          tool_name: funcName,
          arguments: args,
          success: false,
          error: error.message
        });
      }
    }
  }

  return { response_text: responseText, tool_calls };
};

// TTS - Text to speech
const generateTTS = async (text: string): Promise<string | null> => {
  console.log('🔊 Starting TTS generation...');
  const startTime = Date.now();

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        voice: 'nova',
        input: text,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.status}`);
    }

    // Upload to Supabase storage
    const audioBuffer = await response.arrayBuffer();
    const fileName = `voice-reply-${Date.now()}.mp3`;
    
    const { data, error } = await supabase.storage
      .from('voice-replies')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600'
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('voice-replies')
      .getPublicUrl(fileName);

    const duration = Date.now() - startTime;
    console.log(`✅ TTS completed in ${duration}ms`);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('TTS generation failed:', error);
    return null; // TTS is optional
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎤 Voice turn request started');

    // Kill switch check
    if (!checkVoiceCoachEnabled()) {
      return new Response(
        JSON.stringify({ error: 'Voice Coach is currently disabled' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth token for user validation
    const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { audio_blob, mime_type } = await req.json();
    
    if (!audio_blob) {
      return new Response(
        JSON.stringify({ error: 'No audio data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process audio in chunks to prevent memory issues
    console.log('📊 Processing audio data...');
    const binaryAudio = processAudioChunks(audio_blob);
    const recordingDuration = Math.min(binaryAudio.length / 48000, 30); // Approximate duration

    // Check quota (simple check for MVP)
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const { data: quota } = await supabase
      .from('voice_quota')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (quota && quota.used_seconds_month >= (quota.plan_minutes * 60)) {
      return new Response(
        JSON.stringify({ error: 'Monthly voice quota exceeded. Please upgrade your plan.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or update session
    const { data: session } = await supabase
      .from('voice_session')
      .insert({
        user_id: user.id,
        total_seconds: recordingDuration,
        cost_cents: Math.ceil(recordingDuration * 2) // Rough cost estimation
      })
      .select()
      .single();

    const sessionId = session?.id || crypto.randomUUID();

    // Step 1: ASR
    const transcript = await transcribeAudio(binaryAudio);
    console.log('📝 Transcript:', transcript);

    // Step 2: LLM with tools
    const { response_text, tool_calls } = await generateResponse(transcript, user.id);
    console.log('🤖 Response:', response_text);

    // Step 3: TTS (optional)
    const ttsUrl = await generateTTS(response_text);

    // Step 4: Persist turn
    await supabase.from('voice_turn').insert({
      session_id: sessionId,
      role: 'user',
      text: transcript,
      created_at: new Date().toISOString()
    });

    await supabase.from('voice_turn').insert({
      session_id: sessionId,
      role: 'assistant',
      text: response_text,
      audio_url: ttsUrl,
      tool_name: tool_calls.length > 0 ? tool_calls[0].tool_name : null,
      tool_payload: tool_calls.length > 0 ? tool_calls[0] : null,
      tokens_prompt: 150, // Estimate
      tokens_output: 100, // Estimate
      ms_asr: 1000, // Estimate
      ms_tts: ttsUrl ? 2000 : 0,
      created_at: new Date().toISOString()
    });

    // Update quota
    await supabase
      .from('voice_quota')
      .upsert({
        user_id: user.id,
        used_seconds_month: (quota?.used_seconds_month || 0) + Math.ceil(recordingDuration),
        month_key: currentMonth
      });

    // Return response
    const response = {
      transcript,
      reply_text: response_text,
      tts_url: ttsUrl,
      tool_results: tool_calls,
      usage: {
        tokens_prompt: 150,
        tokens_output: 100,
        ms_asr: 1000,
        ms_tts: ttsUrl ? 2000 : 0,
        seconds_recorded: recordingDuration
      }
    };

    console.log('✅ Voice turn completed successfully');
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Voice turn error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Voice processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});