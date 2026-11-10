import { LegalPage } from '@/components/LegalPage';
import { SITE } from '@/config/settings';
import { pageMeta } from '@/lib/seo';

export function generateMetadata() {
  return pageMeta({
    title: 'Disclaimer',
    description:
      'Independent Journey introduces intended parents and surrogates. It is not an agency, law firm or medical provider and gives no legal, medical or surrogacy advice.',
    path: '/disclaimer',
  });
}

export default function Disclaimer() {
  return (
    <LegalPage
      title="Disclaimer"
      sections={[
        { heading: 'Not an agency', body: `${SITE.name} introduces people. We do not match, screen, vet, approve, supervise or guarantee any member, and we take no part in any agreement, payment or medical process between members.` },
        { heading: 'Not legal or medical advice', body: 'Nothing on this platform is legal, medical, financial or psychological advice. Surrogacy involves significant legal and medical steps that must be handled by licensed professionals in your state.' },
        { heading: 'Verification is limited', body: 'A Verified label means a third-party provider matched a government ID to a live selfie. It is not a background check, a medical clearance or an endorsement.' },
        { heading: 'Your safety', body: 'Keep conversations on the platform until you have independently verified who you are speaking with. Never send money to anyone you meet here. Report anything that feels wrong.' },
      ]}
    />
  );
}
