/**
 * Messaging (Phase 6). Every rule lives in the database (send_message,
 * can_message, RLS); this file only calls it and turns codes into words.
 */
import { supabase } from '@/lib/supabase';

export type CanMessage =
  | 'ok' | 'sign_in' | 'same_role' | 'not_available' | 'account_restricted'
  | 'blocked' | 'profile_incomplete' | 'membership_required';

/** Plain-English explanation for each reason the Message button is unavailable. */
export const CAN_MESSAGE_TEXT: Record<Exclude<CanMessage, 'ok'>, string> = {
  sign_in: 'Join free or log in to send a message.',
  same_role: '',
  not_available: 'This member is not available for messages right now.',
  account_restricted: 'Your account is currently restricted. Contact us if you think this is a mistake.',
  blocked: 'Messaging is not available between you and this member.',
  profile_incomplete: 'Finish your profile to start conversations. Intended parents want to know who they are talking to.',
  membership_required: 'A membership unlocks messaging and full surrogate profiles. Memberships open in a coming update.',
};

export const NEVER_SEND_MONEY = 'Never send money to anyone you meet here. Surrogacy payments go through an attorney-managed escrow after a signed contract.';

export const UNVERIFIED_WARNING =
  "This member hasn't verified their identity. Before sharing personal information or making any financial or legal commitments, we strongly suggest verifying who they are yourself, for example with a live video call (FaceTime, Zoom) where they show their face and a photo ID, and by confirming details with their clinic or attorney. Never send money to anyone you meet here.";

export const SCAM_WARNING: Record<string, string> = {
  money_request: 'This message mentions money, fees or payment apps. Legitimate surrogacy arrangements never involve sending money directly to a member. Please be careful and report anything suspicious.',
  early_contact_info: 'This message shares contact details very early. Take your time and keep the conversation here until you are comfortable.',
};

export type ConversationRow = {
  conversation_id: string;
  other_id: string;
  other_name: string;
  other_state: string;
  other_role: 'surrogate' | 'intended_parent';
  other_verified: boolean;
  other_photo_path: string | null;
  last_message_at: string;
  last_preview: string | null;
  unread: number;
  locked: boolean;
  blocked: boolean;
};

export type Message = {
  id: number;
  conversation_id: string;
  sender_id: string;
  body: string;
  scam_flags: string[];
  created_at: string;
  read_at: string | null;
};

export async function canMessage(targetId: string): Promise<CanMessage> {
  if (!supabase) return 'not_available';
  const { data } = await supabase.rpc('can_message', { p_target: targetId });
  return (data as CanMessage) ?? 'not_available';
}

/** Error codes from send_message() in plain words. */
const SEND_ERRORS: Record<string, string> = {
  daily_conversation_limit: 'You have started the maximum number of new conversations for today. Try again tomorrow. (Verified members get a higher limit.)',
  daily_message_limit: 'You have reached today’s message limit. Try again tomorrow.',
  empty_message: 'Write something first.',
  message_too_long: 'Messages can be up to 4000 characters.',
};

export async function sendMessage(toId: string, body: string): Promise<{ conversationId?: string; status?: 'delivered' | 'locked'; flags?: string[]; error?: string }> {
  if (!supabase) return { error: 'Not connected.' };
  const { data, error } = await supabase.rpc('send_message', { p_to: toId, p_body: body });
  if (error) {
    const code = error.message.trim();
    return { error: SEND_ERRORS[code] ?? CAN_MESSAGE_TEXT[code as Exclude<CanMessage, 'ok'>] ?? error.message };
  }
  const r = data as { conversation_id: string; status: 'delivered' | 'locked'; flags: string[] };
  return { conversationId: r.conversation_id, status: r.status, flags: r.flags ?? [] };
}

export async function myConversations(): Promise<ConversationRow[]> {
  if (!supabase) return [];
  const { data } = await supabase.rpc('my_conversations');
  return (data ?? []) as ConversationRow[];
}

export async function conversationMessages(conversationId: string): Promise<Message[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('messages').select('id, conversation_id, sender_id, body, scam_flags, created_at, read_at').eq('conversation_id', conversationId).order('created_at');
  return (data ?? []) as Message[];
}

export async function markRead(conversationId: string) {
  await supabase?.rpc('mark_conversation_read', { p_conversation: conversationId });
}

export async function unreadCount(): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase.rpc('my_unread_count');
  return Number(data ?? 0);
}

export async function blockMember(myId: string, targetId: string) {
  await supabase?.from('blocks').insert({ blocker_id: myId, blocked_id: targetId });
}
export async function unblockMember(myId: string, targetId: string) {
  await supabase?.from('blocks').delete().eq('blocker_id', myId).eq('blocked_id', targetId);
}
export async function haveBlocked(myId: string, targetId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', myId).eq('blocked_id', targetId).maybeSingle();
  return Boolean(data);
}

// Health self-report sharing (surrogate decides, per intended parent).
export async function healthShared(ownerId: string, viewerId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.from('health_shares').select('viewer_id').eq('owner_id', ownerId).eq('viewer_id', viewerId).maybeSingle();
  return Boolean(data);
}
export async function setHealthShared(ownerId: string, viewerId: string, shared: boolean) {
  if (!supabase) return;
  if (shared) await supabase.from('health_shares').insert({ owner_id: ownerId, viewer_id: viewerId });
  else await supabase.from('health_shares').delete().eq('owner_id', ownerId).eq('viewer_id', viewerId);
}
export async function loadSharedHealth(ownerId: string): Promise<Record<string, unknown> | null> {
  if (!supabase) return null;
  const { data } = await supabase.from('health_self_reports').select('*').eq('id', ownerId).maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

// Notices from the safety team.
export type Notice = { id: number; body: string; created_at: string; seen_at: string | null };
export async function myNotices(): Promise<Notice[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('member_notices').select('id, body, created_at, seen_at').is('seen_at', null).order('created_at', { ascending: false });
  return (data ?? []) as Notice[];
}
export async function dismissNotice(id: number) {
  await supabase?.from('member_notices').update({ seen_at: new Date().toISOString() }).eq('id', id);
}

/** A visitor's unsent first message, kept in the browser until they have joined. */
const DRAFT_KEY = (profileId: string) => `ij_draft_${profileId}`;
export function saveDraft(profileId: string, text: string) {
  try { globalThis.localStorage?.setItem(DRAFT_KEY(profileId), text); } catch { /* storage unavailable */ }
}
export function loadDraft(profileId: string): string {
  try { return globalThis.localStorage?.getItem(DRAFT_KEY(profileId)) ?? ''; } catch { return ''; }
}
/** Profile ids with an unsent draft (so the home page can point back to them). */
export function draftProfileIds(): string[] {
  try {
    const ls = globalThis.localStorage; if (!ls) return [];
    const out: string[] = [];
    for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k?.startsWith('ij_draft_') && ls.getItem(k)) out.push(k.slice('ij_draft_'.length)); }
    return out;
  } catch { return []; }
}
export function clearDraft(profileId: string) {
  try { globalThis.localStorage?.removeItem(DRAFT_KEY(profileId)); } catch { /* ignore */ }
}

export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString();
}
