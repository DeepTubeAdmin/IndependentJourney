/**
 * Website stand-in for socialNative.ts. The website signs in with Google's
 * popup or a redirect (see social.ts), so the phone-only code is left out of
 * the web bundle.
 */
export type NativeSocialResult = { signedIn?: true; cancelled?: true; error?: string };

export async function nativeSocialSignIn(_provider: 'google' | 'apple'): Promise<NativeSocialResult> {
  return { error: 'This sign-in method is only used in the phone apps.' };
}
