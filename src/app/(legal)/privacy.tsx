import { LegalPage } from '@/components/LegalPage';
import { SITE } from '@/config/settings';
import { pageMeta } from '@/lib/seo';

export function generateMetadata() {
  return pageMeta({
    title: 'Privacy Policy',
    description:
      'How Independent Journey collects, uses, protects and deletes your information, including profile answers, photos, messages and identity verification results.',
    path: '/privacy',
  });
}

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        { heading: 'What we collect', body: 'Account details (email, password), the profile answers you choose to share, photos, messages sent on the platform, and basic usage information. We never ask for or store medical records.' },
        { heading: 'What others see', body: 'Visitors and members without a membership see a limited preview: first name, state (or country, for intended parents living outside the US), your photos, a few headline preferences and your verification label. A visitor who is not signed in may also read a small number of full profiles (currently three) as a guest before joining; a full profile is your story, your questionnaire answers, the parents’ first names and ages, and your photos. Beyond that, full profiles are shown to members: surrogates read intended-parent profiles free, and intended parents with an active membership read surrogate profiles. Your last name, date of birth, phone, city and email are never shown to other members.' },
        { heading: 'Messages', body: 'Messages you send are stored on our servers, encrypted in transit and at rest, and shown only to the person you wrote to. They are automatically scanned for scam patterns. Our safety team (admin accounts with two-factor authentication) may read messages for safety and fraud prevention when a message is reported or flagged, or when we have reason to believe our rules are being broken; every such access is logged. Health self-report answers are never shown to other members. Blocking a member stops messages in both directions.' },
        { heading: 'Identity verification', body: 'If you choose to verify, your ID and selfie are checked by Stripe Identity under its own privacy policy. We store only the result (verified or not), a reference number and the time; we never see or store the document or the images.' },
        { heading: 'Payments', body: 'Payments are processed by Stripe. We never see or store your full card number; we keep the payment reference, amount and date for your receipt and our records.' },
        { heading: 'Emails we send', body: 'We email you about activity on your account: new messages, membership receipts and reminders, identity-check results, saved-search alerts and an occasional tip. You can turn each category off under Settings; account and security emails (password resets, identity-check results) are always sent. Emails are delivered by a third-party email service that sees your address and the email content.' },
        { heading: 'Members outside the United States', body: 'Intended parents may use Independent Journey from outside the United States. Our servers and service providers are in the United States, so your information is transferred to and processed there, and this policy and US law apply to it. If your country gives you additional rights over your personal data, email us and we will honour reasonable requests to access, correct or delete it.' },
        { heading: 'Analytics', body: 'We use Google Analytics to understand which pages are visited and how people find the site. It sets a cookie and records the pages you view and general device and location information; it never receives your name, email, profile answers or messages. You can block it with a browser setting or extension and the site works the same.' },
        { heading: 'Deleting your account', body: `You can delete your account at any time under Settings → Delete your account, or by emailing us. Your profile, photos, answers, saved profiles, conversations and membership are removed immediately. We keep an anonymous record that an account of your type was deleted, payment records our payment provider requires, and anything the law requires us to keep.` },
        { heading: 'Contact', body: `Questions: ${SITE.supportEmail}` },
      ]}
    />
  );
}
