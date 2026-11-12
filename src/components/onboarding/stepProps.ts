/**
 * Props shared by the final onboarding steps (photos, bio, review).
 * `managed` is true when an agency is editing one of its client profiles.
 */
import type { Profile } from '@/lib/auth';

export type StepProps = {
  profile: Profile;
  profileId: string;
  managed: boolean;
  /** Re-reads the profile after a save. */
  refresh: () => Promise<void> | void;
  /** Builds an onboarding link that keeps ?for= for agency edits. */
  href: (path: string, extra?: string) => string;
  header: React.ReactNode;
  onBack: () => void;
};
