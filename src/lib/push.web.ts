/**
 * Website stand-in for push.ts. Push notifications are a phone-app feature,
 * so on the website every call does nothing and the phone-only code stays out
 * of the web bundle.
 */
export type PushPermission = 'granted' | 'denied' | 'undetermined';

export async function pushPermission(): Promise<PushPermission> {
  return 'denied';
}
export async function registerForPush(): Promise<PushPermission> {
  return 'denied';
}
export async function unregisterPush(): Promise<void> {}
export function setAppBadge(_count: number): void {}
export function onPushOpened(_onOpen: (url: string) => void): () => void {
  return () => undefined;
}
export function onPushReceived(_onArrive: () => void): () => void {
  return () => undefined;
}
