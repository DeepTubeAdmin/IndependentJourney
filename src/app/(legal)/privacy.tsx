import { LegalPage } from '@/components/LegalPage';
import { SITE } from '@/config/settings';

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        { heading: 'What we collect', body: 'Account details (email, password), the profile answers you choose to share, photos, messages sent on the platform, and basic usage information. We never ask for or store medical records.' },
        { heading: 'What others see', body: 'Visitors and members without a membership see only a limited preview: first name, state, one photo, a few headline preferences and your verification label. Full profiles, including all photos, are shown only to intended parents with an active membership. Your last name, date of birth, phone, city and email are never shown to other members.' },
        { heading: 'Identity verification', body: 'If you choose to verify, your ID is checked by a third-party verification provider. We store only the result (verified or not) and a reference number, never the document itself.' },
        { heading: 'Payments', body: 'Payments are processed by our payment providers. We never see or store your full card number.' },
        { heading: 'Deleting your account', body: `You can delete your account at any time from your profile page or by emailing us. Your profile, photos and answers are removed; some records may be kept where the law requires.` },
        { heading: 'Contact', body: `Questions: privacy@${SITE.domain}` },
      ]}
    />
  );
}
