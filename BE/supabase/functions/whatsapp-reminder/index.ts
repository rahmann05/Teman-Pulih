import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ReminderRequest = {
  user_id: number;
  message: string;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const whatsappWebhookUrl = Deno.env.get("WHATSAPP_WEBHOOK_URL") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!supabaseUrl || !supabaseServiceKey || !whatsappWebhookUrl) {
    return new Response("Missing server configuration", { status: 500 });
  }

  let payload: ReminderRequest;
  try {
    payload = await req.json();
  } catch (error) {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  if (!payload?.user_id || !payload?.message) {
    return new Response("user_id and message are required", { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("phone, users ( id, email )")
    .eq("user_id", payload.user_id)
    .single();

  if (profileError || !profile?.phone) {
    return new Response("Phone number not found", { status: 404 });
  }

  const response = await fetch(whatsappWebhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: profile.phone,
      message: payload.message,
      user_id: payload.user_id,
      email: profile?.users?.email ?? null,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(`WhatsApp provider error: ${errorText}`, { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
});
