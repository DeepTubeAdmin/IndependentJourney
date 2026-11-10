import { LegalPage } from '@/components/LegalPage';
import { SITE } from '@/config/settings';
import { pageMeta } from '@/lib/seo';

export function generateMetadata() {
  return pageMeta({
    title: 'Terms of Service',
    description:
      'The terms for using Independent Journey, an introduction platform for intended parents and gestational surrogates. Not an agency, law firm or medical provider.',
    path: '/terms',
  });
}

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      sections={[
        { heading: 'What we are', body: `${SITE.name} is an introduction platform. We are not a surrogacy agency, a law firm, a medical provider or a matching service. We do not screen, vet, approve or recommend any member, and we are not a party to any agreement between members.` },
        { heading: 'Who can join', body: 'You must be at least 18 (21 to create a surrogate profile), an individual acting for yourself (not an agency, broker or recruiter), and you must provide truthful information.' },
        { heading: 'Your responsibilities', body: 'You are responsible for your own screening, legal counsel, medical care and agreements. Independent surrogacy laws vary by state and country. Consult a reproductive attorney before entering any arrangement.' },
        { heading: 'Memberships', body: 'Surrogate accounts are free. Intended parents can browse limited previews for free; a membership (currently $199 for three months, shown before you pay) unlocks full profiles and messaging. A membership is a one-time charge for one term and does not renew automatically; we email you before it ends. During our launch period we may grant memberships free of charge; such a membership can be ended or shortened at any time. Refunds are at our discretion except where the law requires otherwise. Purchases made through the Apple App Store or Google Play are managed and refunded through those stores.' },
        { heading: 'Beta service', body: 'The platform is new and may change, pause or have errors. Features, prices and these terms may be updated; continued use after an update means you accept it.' },
        { heading: 'Conduct', body: 'No harassment, solicitation of payment outside the platform, impersonation, advertising, recruiting for an agency, or creating more than one account. We may suspend or remove accounts that break these rules. You may block or report any member; blocking stops messages in both directions.' },
        { heading: 'Messaging and message review', body: 'Messages are for introductions. Do not request or send money through the platform or ask for payment outside an attorney-managed escrow. To protect members from fraud and abuse, messages are automatically scanned for scam patterns, and members of our safety team (admin accounts protected by two-factor authentication) may read message content when it is reported, flagged, or when we have reason to believe a rule is being broken. Every such access is recorded in a log showing who looked and when. By using messaging you consent to this review. We may hide messages, warn, suspend or remove accounts.' },
        { heading: 'Ending your account', body: 'You can delete your account at any time from Settings. We may keep records the law requires us to keep, and anonymous counts.' },
        { heading: 'Limitation of liability', body: 'The platform is provided as is. To the fullest extent allowed by law, we are not liable for any outcome of introductions made here.' },
      ]}
    />
  );
}
