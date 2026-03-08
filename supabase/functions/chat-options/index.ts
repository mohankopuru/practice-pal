import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, systemPrompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const optionsSystemPrompt = `${systemPrompt}

IMPORTANT: You must generate exactly 5 different possible responses to the user's last message. Each response MUST reflect a distinctly DIFFERENT emotional tone and communication approach — for example: supportive, dismissive, angry, sarcastic, anxious, curious, cold, warm, passive-aggressive, confrontational, empathetic, etc. Cover a wide emotional range from best-case to worst-case reactions. Each option should feel like something a real person with this personality might actually say in different moods. Keep each response to 1-3 sentences. Also provide a short label (2-4 words) describing the tone/approach of each option.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: optionsSystemPrompt },
          ...messages,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_response_options",
              description: "Provide 3 different possible responses the character might give, each with a different tone or approach.",
              parameters: {
                type: "object",
                properties: {
                  options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: {
                          type: "string",
                          description: "Short 2-4 word label describing this response's tone (e.g. 'Supportive & warm', 'Annoyed & dismissive', 'Cautiously curious')",
                        },
                        emoji: {
                          type: "string",
                          description: "A single emoji that represents the emotional tone of this response",
                        },
                        message: {
                          type: "string",
                          description: "The actual in-character response message, 1-3 sentences",
                        },
                      },
                      required: ["label", "emoji", "message"],
                      additionalProperties: false,
                    },
                    minItems: 3,
                    maxItems: 3,
                  },
                },
                required: ["options"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_response_options" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "Failed to generate response options" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat-options error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
