/**
 * "Continue with Google" and "Continue with Apple" buttons. Web only for now.
 * The parent decides what must be true before a press is allowed (on the
 * sign-up page: the agreement boxes), via `ready` and onBeforeStart.
 *
 * Google: when EXPO_PUBLIC_GOOGLE_CLIENT_ID is set we show Google's own button
 * (Google Identity Services) and its popup, which names our site rather than
 * the database host. The popup gives an ID token that Supabase turns into a
 * session. Without the setting we fall back to the Supabase redirect.
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { FormMessage } from '@/components/form';
import {
  SOCIAL_LABEL,
  type SocialProvider,
  googleClientId,
  googlePopupAvailable,
  makeNonce,
  signInWithGoogleIdToken,
  socialAvailable,
  startSocialSignIn,
} from '@/lib/social';
import { colors, fonts, radius, space } from '@/lib/theme';

type Props = {
  /** Runs before the redirect. Return false (after showing your own error) to stop. */
  onBeforeStart?: (provider: SocialProvider) => Promise<boolean> | boolean;
  /**
   * False while the parent still needs something from the member (the agreement
   * boxes). Then Google's real button is swapped for a look-alike whose press
   * only runs onBeforeStart, so the errors show. Default true.
   */
  ready?: boolean;
  /** Short line above the buttons. */
  caption?: string;
};

export function SocialButtons({ onBeforeStart, ready = true, caption = 'Or continue with' }: Props) {
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState('');
  if (!socialAvailable) return null;

  // Google popup mode while not ready: just run the parent's checks so the
  // member sees what is missing.
  async function gateOnly() {
    setError('');
    if (onBeforeStart) await onBeforeStart('google');
  }

  async function go(provider: SocialProvider) {
    setError('');
    if (onBeforeStart && !(await onBeforeStart(provider))) return;
    setBusy(provider);
    const err = await startSocialSignIn(provider);
    if (err) {
      setBusy(null);
      setError(err);
    }
    // On success the browser is leaving this page; nothing more to do.
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.rule}><View style={styles.line} /><Text style={styles.caption}>{caption}</Text><View style={styles.line} /></View>
      {error ? <FormMessage kind="error" text={error} /> : null}
      <View style={styles.row}>
        {googlePopupAvailable && ready ? (
          <GoogleIdentityButton
            onBeforeStart={async () => (onBeforeStart ? onBeforeStart('google') : true)}
            onError={setError}
          />
        ) : (
          <SocialButton provider="google" busy={busy} onPress={() => (googlePopupAvailable ? gateOnly() : go('google'))} />
        )}
        <SocialButton provider="apple" busy={busy} onPress={() => go('apple')} />
      </View>
    </View>
  );
}

// Minimal typing for the Google Identity Services script we load at runtime.
type GoogleAccounts = {
  accounts: {
    id: {
      initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void; nonce?: string; ux_mode?: 'popup'; use_fedcm_for_prompt?: boolean; itp_support?: boolean }) => void;
      renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
    };
  };
};
declare global {
  interface Window { google?: GoogleAccounts }
}

let gisLoading: Promise<GoogleAccounts> | null = null;
/** Loads https://accounts.google.com/gsi/client once. */
function loadGis(): Promise<GoogleAccounts> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (!gisLoading) {
    gisLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => (window.google ? resolve(window.google) : reject(new Error('Google sign-in did not load.')));
      s.onerror = () => reject(new Error('Google sign-in could not be loaded. Check your connection or ad blocker.'));
      document.head.appendChild(s);
    });
  }
  return gisLoading;
}

/**
 * Google's own button. Google draws it into a plain element; the element is the
 * DOM node behind a React Native View on web.
 */
function GoogleIdentityButton({ onBeforeStart, onError }: { onBeforeStart: () => Promise<boolean>; onError: (msg: string) => void }) {
  const holder = useRef<React.ElementRef<typeof View>>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'signing-in' | 'failed'>('loading');
  const nonceRef = useRef<{ raw: string; hashed: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const nonce = await makeNonce();
        nonceRef.current = nonce;
        const google = await loadGis();
        if (cancelled) return;
        google.accounts.id.initialize({
          client_id: googleClientId,
          nonce: nonce.hashed,
          ux_mode: 'popup',
          itp_support: true,
          callback: async ({ credential }) => {
            setStatus('signing-in');
            // Give the parent a last chance to refuse (and to remember the sign-up choice).
            if (!(await onBeforeStart())) { setStatus('ready'); return; }
            const err = await signInWithGoogleIdToken(credential, nonce.raw);
            if (err) { onError(err); setStatus('ready'); return; }
            router.replace('/welcome');
          },
        });
        const el = holder.current as unknown as HTMLElement | null;
        if (!el) return;
        el.innerHTML = '';
        google.accounts.id.renderButton(el, {
          type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', logo_alignment: 'left', width: el.clientWidth || 280,
        });
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        setStatus('failed');
        onError(e instanceof Error ? e.message : 'Google sign-in could not be loaded.');
      }
    })();
    return () => { cancelled = true; };
    // onBeforeStart/onError are stable enough per mount; re-initialising on every render would re-draw the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.gisWrap}>
      <View ref={holder} style={styles.gisHolder} />
      {status !== 'ready' ? (
        <Text style={styles.gisStatus}>{status === 'signing-in' ? 'Signing you in…' : status === 'failed' ? 'Google sign-in unavailable' : 'Loading Google…'}</Text>
      ) : null}
    </View>
  );
}

function SocialButton({ provider, busy, onPress }: { provider: SocialProvider; busy: SocialProvider | null; onPress: () => void }) {
  const disabled = busy !== null;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={SOCIAL_LABEL[provider]}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {provider === 'google' ? <GoogleMark /> : <AppleMark />}
      <Text style={styles.label}>{busy === provider ? 'Opening…' : SOCIAL_LABEL[provider]}</Text>
    </Pressable>
  );
}

// Brand marks drawn inline so no image request is needed.
function GoogleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" accessibilityLabel="">
      <Path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <Path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <Path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <Path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </Svg>
  );
}

function AppleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" accessibilityLabel="">
      <Path fill={colors.text} d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  rule: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  caption: { fontFamily: fonts.body, fontSize: 13, color: colors.textSubtle },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  btn: { flexGrow: 1, flexBasis: 200, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 46, paddingHorizontal: 16, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  pressed: { borderColor: colors.primary },
  disabled: { opacity: 0.6 },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  gisWrap: { flexGrow: 1, flexBasis: 200, minHeight: 46, justifyContent: 'center' },
  gisHolder: { minHeight: 44, alignItems: 'stretch' },
  gisStatus: { fontFamily: fonts.body, fontSize: 13, color: colors.textSubtle, textAlign: 'center' },
});
