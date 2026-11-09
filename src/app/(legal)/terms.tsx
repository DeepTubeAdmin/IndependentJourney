import { LegalPage } from '@/components/LegalPage';
import { SITE } from '@/config/settings';

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      sections={[
        { heading: 'What we are', body: `${SITE.name} is an introduction platform. We are not a surrogacy agency, a law firm, a medical provider or a matching service. We do not screen, vet, approve or recommend any member, and we are not a party to any agreement between members.` },
        { heading: 'Who can join', body: 'You must be at least 18 (21 to create a surrogate profile), an individual acting for yourself (not an agency, broker or recruiter), and you must provide truthful information.' },
        { heading: 'Your responsibilities', body: 'You are responsible for your own screening, legal counsel, medical care and agreements. Independent surrogacy laws vary by state and country. Consult a reproductive attorney before entering any arrangement.' },
        { heading: 'Memberships', body: 'Surrogate accounts are free. Intended parent memberships renew automatically until cancelled. Cancelling stops the next charge; the current term runs to its end. Purchases made through the Apple App Store or Google Play are managed and refunded through those stores.' },
        { heading: 'Conduct', body: 'No harassment, solicitation of payment outside the platform, impersonation, advertising or recruiting for an agency. We may suspend or remove accounts that break these rules.' },
        { heading: 'Messaging and message review', body: 'Messages are for introductions. Do not request or send money through the platform or ask for payment outside an attorney-managed escrow. To protect members from fraud and abuse, messages are automatically scanned for scam patterns, and members of our safety team (admin accounts protected by two-factor authentication) may read message content when it is reported, flagged, or when we have reason to believe a rule is being broken. Every such access is recorded in a log showing who looked and when. By using messaging you consent to this review. We may hide messages, warn, suspend or remove accounts.' },
        { heading: 'Limitation of liability', body: 'The platform is provided as is. To the fullest extent allowed by law, we are not liable for any outcome of introductions made here.' },
      ]}
    />
  );
}
