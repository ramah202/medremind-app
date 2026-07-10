// styles/auth/signInStyles.ts
import { StyleSheet, Dimensions } from 'react-native';
import { Colors, Typography, Spacing } from '../common';

const { width } = Dimensions.get('window');

export const signInStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: Dimensions.get('window').height,
  },
  iconContainer: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.h1.fontSize,
    fontWeight: Typography.h1.fontWeight,
    color: Colors.text.white,
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 40,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Spacing.borderRadius.xl,
    padding: Spacing.padding.xxxl,
    width: width - 40,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  welcomeText: {
    fontSize: Typography.h4.fontSize,
    fontWeight: Typography.h4.fontWeight,
    color: Colors.text.primary,
    marginBottom: Spacing.xxxl,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: Spacing.borderRadius.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.grey[100],
    height: 55,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: Typography.body1.fontSize,
    color: Colors.text.primary,
    height: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 25,
  },
  forgotPasswordText: {
    color: Colors.primary.main,
    fontSize: Typography.body2.fontSize,
    fontWeight: '500',
  },
  signInButton: {
    backgroundColor: Colors.primary.main,
    paddingVertical: Spacing.lg,
    borderRadius: Spacing.borderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    shadowColor: Colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  signInButtonText: {
    color: Colors.text.white,
    fontSize: Typography.button.fontSize,
    fontWeight: Typography.button.fontWeight,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footer: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[300],
  },
  footerText: {
    color: Colors.text.secondary,
    fontSize: Typography.body2.fontSize,
  },
  signUpText: {
    color: Colors.primary.main,
    fontSize: Typography.body2.fontSize,
    fontWeight: '600',
  },
});