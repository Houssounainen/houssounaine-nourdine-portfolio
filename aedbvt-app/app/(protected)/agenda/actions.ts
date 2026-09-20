"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";

function toToliaraIso(value: string) {
  if (!value) return new Date().toISOString();
  return new Date(value + (value.length === 16 ? ":00+03:00" : "+03:00")).toISOString();
}

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, user, role: profile?.role || null };
}

export async function createEvent(formData: FormData) {
  const { supabase, user, role } = await context();
  if (!user || !isStaff(role)) return;
  const title = String(formData.get("title") || "").trim();
  const starts = String(formData.get("starts_at") || "").trim();
  if (!title || !starts) return;

  await supabase.from("events").insert({
    title,
    description: String(formData.get("description") || "").trim(),
    location: String(formData.get("location") || "").trim(),
    category: String(formData.get("category") || "Vie associative"),
    starts_at: toToliaraIso(starts),
    published: true,
    created_by: user.id,
  });
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

export async function createMeeting(formData: FormData) {
  const { supabase, user, role } = await context();
  if (!user || !isStaff(role)) return;
  const title = String(formData.get("title") || "").trim();
  const starts = String(formData.get("starts_at") || "").trim();
  if (!title || !starts) return;

  const agenda = String(formData.get("agenda") || "").split("\n").map((x) => x.trim()).filter(Boolean);
  await supabase.from("meetings").insert({
    title,
    starts_at: toToliaraIso(starts),
    location: String(formData.get("location") || "").trim(),
    mode: String(formData.get("mode") || "Présentiel"),
    agenda,
    published: true,
    created_by: user.id,
  });
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}

export async function toggleEventRegistration(formData: FormData) {
  const { supabase, user } = await context();
  if (!user) return;
  const eventId = String(formData.get("event_id") || "");
  const current = String(formData.get("current") || "off");
  if (!eventId) return;

  if (current === "on") {
    await supabase.from("event_registrations").delete().eq("event_id", eventId).eq("user_id", user.id);
  } else {
    await supabase.from("event_registrations").upsert({ event_id: eventId, user_id: user.id, status: "going", updated_at: new Date().toISOString() });
  }
  revalidatePath("/agenda");
}

export async function toggleMeetingAttendance(formData: FormData) {
  const { supabase, user } = await context();
  if (!user) return;
  const meetingId = String(formData.get("meeting_id") || "");
  const current = String(formData.get("current") || "off");
  if (!meetingId) return;

  if (current === "on") {
    await supabase.from("meeting_attendance").delete().eq("meeting_id", meetingId).eq("user_id", user.id);
  } else {
    await supabase.from("meeting_attendance").upsert({ meeting_id: meetingId, user_id: user.id, status: "confirmed", updated_at: new Date().toISOString() });
  }
  revalidatePath("/agenda");
}

export async function saveMeetingMinutes(formData: FormData) {
  const { supabase, role } = await context();
  if (!isStaff(role)) return;
  const meetingId = String(formData.get("meeting_id") || "");
  const minutes = String(formData.get("minutes") || "").trim();
  if (!meetingId) return;
  await supabase.from("meetings").update({ minutes }).eq("id", meetingId);
  revalidatePath("/agenda");
}
