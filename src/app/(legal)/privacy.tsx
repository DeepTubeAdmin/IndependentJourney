import { LegalPage } from '@/components/LegalPage';
import { SITE } from '@/config/settings';

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        { heading: 'What we collect', body: 'Account details (email, password), the profile answers you choose to share, photos, messages sent on the platform, and basic usage information. We never ask for or store medical records.' },
        { heading: 'What others see', body: 'Visitors and members without a membership see only a limited preview: first name, state, one photo, a few headline preferences and your verification label. Full profiles, including all photos, are shown only to intended parents with an active membership. Your last name, date of birth, phone, city and email are never shown to other members.' },
        { heading: 'Messages', body: 'Messages you send are stored on our servers, encrypted in transit and at rest, and shown only to the person you wrote to. They are automatically scanned for scam patterns. Our safety team (admin accounts with two-factor authentication) may read messages for safety and fraud prevention when a message is reported or flagged, or when we have reason to believe our rules are being broken; every such access is logged. Health self-reports are shared only when the surrogate chooses to share them inside a conversation, and that sharing can be withdrawn at any time. Blocking a member stops messages in both directions.' },
        { heading: 'Identity verification', body: 'If you choose to verify, your ID is checked by a third-party verification provider. We store only the result (verified or not) and a reference number, never the document itself.' },
        { heading: 'Payments', body: 'Payments are processed by our payment providers. We never see or store your full card number.' },
        { heading: 'Deleting your account', body: `You can delete your account at any time from your profile page or by emailing us. Your profile, photos and answers are removed; some records may be kept where the law requires.` },
        { heading: 'Contact', body: `Questions: privacy@${SITE.domain}` },
      ]}
    />
  );
}
