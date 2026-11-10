import { LegalPage } from '@/components/LegalPage';
import { SITE } from '@/config/settings';

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        { heading: 'What we collect', body: 'Account details (email, password), the profile answers you choose to share, photos, messages sent on the platform, and basic usage information. We never ask for or store medical records.' },
        { heading: 'What others see', body: 'Visitors and members without a membership see only a limited preview: first name, state, one photo, a few headline preferences and your verification label. Full profiles, including all photos, are shown only to intended parents with an active membership. Your last name, date of birth, phone, city and email are never shown to other members.' },
        { heading: 'Messages', body: 'Messages you send are stored on our servers, encrypted in transit and at rest, and shown only to the person you wrote to. They are automatically scanned for scam patterns. Our safety team (admin accounts with two-factor authentication) may read messages for safety and fraud prevention when a message is reported or flagged, or when we have reason to believe our rules are being broken; every such access is logged. Health self-report answers are never shown to other members. Blocking a member stops messages in both directions.' },
        { heading: 'Identity verification', body: 'If you choose to verify, your ID and selfie are checked by Stripe Identity under its own privacy policy. We store only the result (verified or not), a reference number and the time; we never see or store the document or the images.' },
        { heading: 'Payments', body: 'Payments are processed by Stripe. We never see or store your full card number; we keep the payment reference, amount and date for your receipt and our records.' },
        { heading: 'Emails we send', body: 'We email you about activity on your account: new messages, membership receipts and reminders, identity-check results, saved-search alerts and an occasional tip. You can turn each category off under Settings; account and security emails (password resets, identity-check results) are always sent. Emails are delivered by a third-party email service that sees your address and the email content.' },
        { heading: 'Deleting your account', body: `You can delete your account at any time under Settings → Delete your account, or by emailing us. Your profile, photos, answers, saved profiles, conversations and membership are removed immediately. We keep an anonymous record that an account of your type was deleted, payment records our payment provider requires, and anything the law requires us to keep.` },
        { heading: 'Contact', body: `Questions: privacy@${SITE.domain}` },
      ]}
    />
  );
}
