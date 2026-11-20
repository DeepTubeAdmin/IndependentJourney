/**
 * Messaging (Phase 6). Every rule lives in the database (send_message,
 * can_message, RLS); this file only calls it and turns codes into words.
 */
import { supabase } from '@/lib/supabase';
import { getItem, keysWithPrefix, removeItem, setItem } from '@/lib/storage';

export type CanMessage =
  | 'ok' | 'sign_in' | 'same_role' | 'not_available' | 'account_restricted'
  | 'blocked' | 'profile_incomplete' | 'membership_required'
  | 'agency_messages_off' | 'agency_access_required';

/** Plain-English explanation for each reason the Message button is unavailable. */
export const CAN_MESSAGE_TEXT: Record<Exclude<CanMessage, 'ok'>, string> = {
  sign_in: 'Join free or log in to send a message.',
  same_role: 'Messages are only between surrogates and intended parents.',
  not_available: 'This member is not available for messages right now.',
  account_restricted: 'Your account is currently restricted. Contact us if you think this is a mistake.',
  blocked: 'Messaging is not available between you and this member.',
  profile_incomplete: 'Finish your profile to send messages. Members want to know who they are talking to.',
  membership_required: 'A membership unlocks messaging and full surrogate profiles.',
  agency_messages_off: 'This member has asked to hear from independent members only. They can still write to your client first.',
  agency_access_required: 'Your agency account needs to be active (and, when pricing is on, paid up) before its profiles can message.',
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
  /** ISO country code of the other member ('US' unless an intended parent abroad). */
  other_country?: string | null;
  other_role: 'surrogate' | 'intended_parent';
  other_verified: boolean;
  other_photo_path: string | null;
  last_message_at: string;
  last_preview: string | null;
  unread: number;
  locked: boolean;
  blocked: boolean;
  /** Which of my profiles this conversation belongs to (an agency has several). */
  mine_id: string;
  mine_name: string;
  other_profile_type: 'independent' | 'with_agency' | 'agency';
  other_agency_name: string | null;
};

export type Message = {
  id: number;
  conversation_id: string;
  sender_id: string;
  /** The login that wrote it (an agency staffer when sender_id is an agency-posted profile). */
  sent_by?: string | null;
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

/** Can profile `fromId` (mine, or a client profile my agency manages) message `targetId`? */
export async function canMessageAs(fromId: string, targetId: string): Promise<CanMessage> {
  if (!supabase) return 'not_available';
  const { data } = await supabase.rpc('can_message_as', { p_from: fromId, p_target: targetId });
  return (data as CanMessage) ?? 'not_available';
}

/** Send as a specific profile (agencies write on behalf of a client). */
export async function sendMessageAs(fromId: string, toId: string, body: string): Promise<{ conversationId?: string; status?: 'delivered' | 'locked'; flags?: string[]; error?: string }> {
  if (!supabase) return { error: 'The app is not connected to a database yet.' };
  const { data, error } = await supabase.rpc('send_message_as', { p_from: fromId, p_to: toId, p_body: body });
  if (error) {
    const code = error.message.trim();
    return { error: SEND_ERRORS[code] ?? CAN_MESSAGE_TEXT[code as Exclude<CanMessage, 'ok'>] ?? error.message };
  }
  const d = data as { conversation_id: string; status: 'delivered' | 'locked'; flags: string[] };
  return { conversationId: d.conversation_id, status: d.status, flags: d.flags ?? [] };
}

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
  notifyUnreadChanged();
}

// The header shows an unread badge. Screens that change what is unread
// (opening a conversation) call notifyUnreadChanged() so it updates at once.
const unreadListeners = new Set<() => void>();
export function subscribeUnread(listener: () => void): () => void {
  unreadListeners.add(listener);
  return () => {
    unreadListeners.delete(listener);
  };
}
export function notifyUnreadChanged() {
  unreadListeners.forEach((fn) => fn());
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

/** Everyone the signed-in member (or an agency's client profiles) has blocked. Null if the list is not available yet. */
export type BlockedMember = { blocker_id: string; blocked_id: string; display_name: string; blocked_at: string };
export async function myBlockedMembers(): Promise<BlockedMember[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('my_blocked_members');
  return error ? null : ((data ?? []) as BlockedMember[]);
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

/** A visitor's unsent first message, kept on the device until they have joined. */
const DRAFT_KEY = (profileId: string) => `ij_draft_${profileId}`;
export function saveDraft(profileId: string, text: string) {
  setItem(DRAFT_KEY(profileId), text);
}
export function loadDraft(profileId: string): string {
  return getItem(DRAFT_KEY(profileId)) ?? '';
}
/** Profile ids with an unsent draft (so the home page can point back to them). */
export function draftProfileIds(): string[] {
  return keysWithPrefix('ij_draft_').filter((k) => getItem(k)).map((k) => k.slice('ij_draft_'.length));
}
export function clearDraft(profileId: string) {
  removeItem(DRAFT_KEY(profileId));
}

export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString();
}
