// styles/common/typography.ts
import { Platform } from 'react-native';

export const Typography = {
  fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  
  h1: {
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 41,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  h3: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 29,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  h5: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  h6: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 19,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 21,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  overline: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
};