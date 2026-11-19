/**
 * Are we running as the phone/tablet app (bottom tab bar, compact top bar)
 * or as the website (full header)?
 *
 * Setting EXPO_PUBLIC_APP_SHELL=1 makes a web build use the app layout, which
 * lets us check the phone design in a browser without installing a build.
 * It is never set for the live website.
 */
import { Platform } from 'react-native';

export const isApp = Platform.OS !== 'web' || process.env.EXPO_PUBLIC_APP_SHELL === '1';
