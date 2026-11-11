/**
 * /share/<token>: the same page as /s/<token>.
 *
 * Members hand out /s/<token>. Netlify forwards that address to the
 * share-preview function, which gives Facebook and friends a preview card
 * and sends people here. Keeping /s/<token> as a real page too means links
 * still work if the forwarding is ever switched off.
 */
export { default, generateMetadata } from '../s/[token]';
