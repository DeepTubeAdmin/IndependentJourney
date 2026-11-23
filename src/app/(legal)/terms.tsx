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
        { heading: 'Who can join', body: 'You must be at least 18 (21 to create a surrogate profile) and provide truthful information. Members join as individuals acting for themselves. Surrogacy agencies may apply for a separate agency account (see “Agency accounts” below); they may not create member accounts.' },
        { heading: 'Agency accounts', body: `A surrogacy agency may create an agency account. We do not screen or approve agencies before they join, and we may suspend or remove an agency account at any time at our discretion. An agency may post profiles only for clients who have given the agency written consent to be listed here, must keep those profiles truthful and current, and must remove a profile when the client asks or the relationship ends. Profiles posted by an agency are labelled with the agency's name, and messages to them are read and answered by the agency on the client's behalf. Information an agency gives about its services, states and fees is the agency's own statement; ${SITE.name} does not verify it, does not endorse any agency, and takes no part in any agreement or payment between an agency, its clients and other members. Agency accounts are free.` },
        { heading: 'Your responsibilities', body: 'You are responsible for your own screening, legal counsel, medical care and agreements. Independent surrogacy laws vary by state and country. Consult a reproductive attorney before entering any arrangement.' },
        { heading: 'Verifying other members is your responsibility', body: `You alone are responsible for confirming the identity, background, health, finances and intentions of anyone you meet through ${SITE.name}, including any agency. We do not run background checks, and we do not confirm that what a member says in a profile or a message is true. Some profiles carry a Verified label. That label means only that a third-party provider (Stripe Identity) matched a government-issued ID to a live selfie at one moment in time. It is not a background check, a criminal record check, a medical or psychological clearance, a check of anyone's finances, or a recommendation, and it does not mean the member is honest or that anything else in their profile is accurate. Identity checks can be fooled, and a person with a Verified label can still commit fraud or cause harm. Do not rely on the label as a reason to trust anyone. Do your own checking, work through your own reproductive attorney, and use an attorney-managed escrow for every payment. To the fullest extent allowed by law, ${SITE.name} is not responsible or liable for the acts, omissions, statements or identity of any member, whether or not their profile is marked Verified, or for any fraud, loss or harm that results from dealing with someone you met here.` },
        { heading: 'Free to use', body: `${SITE.name} is free for surrogates, intended parents and agencies. Creating a profile, reading profiles, messaging and identity verification cost nothing, and we charge no match fees or fees tied to a pregnancy or birth. If we ever introduce a paid feature, we will tell you clearly beforehand, and you will never be charged for anything you did not choose to buy.` },
        { heading: 'Beta service', body: 'The platform is new and may change, pause or have errors. Features and these terms may be updated; continued use after an update means you accept it.' },
        { heading: 'Conduct', body: 'No harassment, solicitation of payment outside the platform, impersonation, advertising, recruiting for an agency from a member account, or creating more than one account. We may suspend or remove accounts that break these rules. You may block or report any member; blocking stops messages in both directions.' },
        { heading: 'Messaging and message review', body: 'Messages are for introductions. Do not request or send money through the platform or ask for payment outside an attorney-managed escrow. To protect members from fraud and abuse, messages are automatically scanned for scam patterns, and members of our safety team (admin accounts protected by two-factor authentication) may read message content when it is reported, flagged, or when we have reason to believe a rule is being broken. Every such access is recorded in a log showing who looked and when. By using messaging you consent to this review. We may hide messages, warn, suspend or remove accounts.' },
        { heading: 'Ending your account', body: 'You can delete your account at any time from Settings. We may keep records the law requires us to keep, and anonymous counts.' },
        { heading: 'Limitation of liability', body: 'The platform is provided as is. To the fullest extent allowed by law, we are not liable for any outcome of introductions made here, including fraud or misrepresentation by another member, whether or not that member is marked Verified.' },
      ]}
    />
  );
}
