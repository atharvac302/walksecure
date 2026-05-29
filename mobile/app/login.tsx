import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Animated, Dimensions, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestOTP, verifyOTP, signupRequest, signupVerify, googleAuth } from '../services/api';

const { height } = Dimensions.get('window');

// ─── Mock Google Accounts ────────────────────────────────────
const MOCK_GOOGLE_ACCOUNTS = [
  { name: 'Hrugved Kolhe',    email: 'hrugvedkolhe@gmail.com',    phone: '+919999999991', color: '#4285F4' },
  { name: 'Atharva C',        email: 'atharvac302@gmail.com',     phone: '+919284953631', color: '#EA4335' },
  { name: 'Demo User',        email: 'demo.walksecure@gmail.com', phone: '+919000000001', color: '#34A853' },
];

type AuthStep = 'landing' | 'login_email' | 'login_otp' | 'signup_details' | 'signup_otp';

// ─── InputField (top-level stable component) ─────────────────

interface InputFieldProps {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: any;
  autoCapitalize?: any;
  secureTextEntry?: boolean;
}

const InputField = React.memo(({
  icon, placeholder, value, onChangeText,
  keyboardType = 'default', autoCapitalize = 'none', secureTextEntry = false,
}: InputFieldProps) => (
  <View style={styles.inputWrapper}>
    <Ionicons name={icon as any} size={18} color="#94a3b8" style={styles.inputIcon} />
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#475569"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      secureTextEntry={secureTextEntry}
    />
  </View>
));

// ─── OtpBoxes (top-level stable component) ───────────────────

interface OtpBoxesProps {
  otpDigits: string[];
  onChange: (val: string, idx: number) => void;
  onKeyPress: (e: any, idx: number) => void;
  refs: React.RefObject<TextInput>[];
}

const OtpBoxes = React.memo(({ otpDigits, onChange, onKeyPress, refs }: OtpBoxesProps) => (
  <View style={styles.otpRow}>
    {otpDigits.map((d, i) => (
      <TextInput
        key={i}
        ref={refs[i]}
        style={[styles.otpBox, d ? styles.otpBoxFilled : null]}
        value={d}
        onChangeText={v => onChange(v, i)}
        onKeyPress={e => onKeyPress(e, i)}
        keyboardType="number-pad"
        maxLength={1}
        selectTextOnFocus
      />
    ))}
  </View>
));

// ─── Shared sub-components (top-level) ───────────────────────

interface GoogleBtnProps { onPress: () => void; }
const GoogleBtn = React.memo(({ onPress }: GoogleBtnProps) => (
  <TouchableOpacity style={styles.googleBtn} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.googleIcon}>
      <Text style={styles.googleLetters}>
        <Text style={{ color: '#4285F4' }}>G</Text>
        <Text style={{ color: '#EA4335' }}>o</Text>
        <Text style={{ color: '#FBBC05' }}>o</Text>
        <Text style={{ color: '#4285F4' }}>g</Text>
        <Text style={{ color: '#34A853' }}>l</Text>
        <Text style={{ color: '#EA4335' }}>e</Text>
      </Text>
    </View>
    <Text style={styles.googleBtnText}>Continue with Google</Text>
  </TouchableOpacity>
));

const Divider = React.memo(() => (
  <View style={styles.dividerRow}>
    <View style={styles.dividerLine} />
    <Text style={styles.dividerText}>or</Text>
    <View style={styles.dividerLine} />
  </View>
));

interface BackBtnProps { onPress: () => void; }
const BackBtn = React.memo(({ onPress }: BackBtnProps) => (
  <TouchableOpacity style={styles.backBtn} onPress={onPress} activeOpacity={0.7}>
    <Ionicons name="arrow-back" size={20} color="#94a3b8" />
    <Text style={styles.backBtnText}>Back</Text>
  </TouchableOpacity>
));

// ─── LandingStep ─────────────────────────────────────────────

interface LandingStepProps {
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  onLoginEmail: () => void;
  onSignup: () => void;
  onGoogle: () => void;
}

const LandingStep = React.memo(({ fadeAnim, slideAnim, onLoginEmail, onSignup, onGoogle }: LandingStepProps) => (
  <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
    <View style={styles.logoRow}>
      <View style={styles.logoCircle}>
        <Ionicons name="shield-checkmark" size={36} color="#fff" />
      </View>
    </View>
    <Text style={styles.appName}>WalkSecure</Text>
    <Text style={styles.tagline}>Your personal safety companion</Text>

    <GoogleBtn onPress={onGoogle} />
    <Divider />

    <TouchableOpacity style={styles.primaryBtn} onPress={onLoginEmail} activeOpacity={0.85}>
      <Ionicons name="mail-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
      <Text style={styles.primaryBtnText}>Sign in with Email</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.ghostBtn} onPress={onSignup} activeOpacity={0.85}>
      <Text style={styles.ghostBtnText}>Create an account</Text>
    </TouchableOpacity>

    <Text style={styles.legalText}>
      By continuing, you agree to our{' '}
      <Text style={styles.legalLink}>Terms</Text> and{' '}
      <Text style={styles.legalLink}>Privacy Policy</Text>
    </Text>
  </Animated.View>
));

// ─── LoginEmailStep ──────────────────────────────────────────

interface LoginEmailStepProps {
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  shakeAnim: Animated.Value;
  email: string;
  setEmail: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string;
  onBack: () => void;
  onGoogle: () => void;
  onSignup: () => void;
}

const LoginEmailStep = React.memo(({
  fadeAnim, slideAnim, shakeAnim,
  email, setEmail, onSubmit, loading, error, onBack, onGoogle, onSignup,
}: LoginEmailStepProps) => (
  <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
    <BackBtn onPress={onBack} />
    <Text style={styles.cardTitle}>Welcome back</Text>
    <Text style={styles.cardSub}>Enter your registered email to receive a sign-in OTP</Text>

    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
      <InputField
        icon="mail-outline" placeholder="Email address"
        value={email} onChangeText={setEmail}
        keyboardType="email-address"
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </Animated.View>

    <TouchableOpacity style={styles.primaryBtn} onPress={onSubmit} disabled={loading} activeOpacity={0.85}>
      {loading ? <ActivityIndicator color="#fff" /> : <>
        <Ionicons name="send-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.primaryBtnText}>Send OTP</Text>
      </>}
    </TouchableOpacity>

    <Divider />
    <GoogleBtn onPress={onGoogle} />

    <TouchableOpacity onPress={onSignup} style={styles.switchLink}>
      <Text style={styles.switchLinkText}>
        Don't have an account? <Text style={styles.switchLinkHighlight}>Sign up</Text>
      </Text>
    </TouchableOpacity>
  </Animated.View>
));

// ─── LoginOtpStep ────────────────────────────────────────────

interface LoginOtpStepProps {
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  shakeAnim: Animated.Value;
  otpSentTo: string;
  otpDigits: string[];
  onChange: (val: string, idx: number) => void;
  onKeyPress: (e: any, idx: number) => void;
  otpRefs: React.RefObject<TextInput>[];
  onSubmit: () => void;
  onResend: () => void;
  loading: boolean;
  error: string;
  onBack: () => void;
}

const LoginOtpStep = React.memo(({
  fadeAnim, slideAnim, shakeAnim,
  otpSentTo, otpDigits, onChange, onKeyPress, otpRefs,
  onSubmit, onResend, loading, error, onBack,
}: LoginOtpStepProps) => (
  <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
    <BackBtn onPress={onBack} />
    <View style={styles.otpIconRow}>
      <View style={styles.otpIconCircle}>
        <Ionicons name="lock-closed" size={28} color="#3b82f6" />
      </View>
    </View>
    <Text style={styles.cardTitle}>Verify your identity</Text>
    <Text style={styles.cardSub}>{otpSentTo}</Text>

    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
      <OtpBoxes
        otpDigits={otpDigits}
        onChange={onChange}
        onKeyPress={onKeyPress}
        refs={otpRefs}
      />
      {!!error && <Text style={[styles.errorText, { textAlign: 'center' }]}>{error}</Text>}
    </Animated.View>

    <TouchableOpacity
      style={styles.primaryBtn}
      onPress={onSubmit}
      disabled={loading} activeOpacity={0.85}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <>
        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.primaryBtnText}>Verify &amp; Sign In</Text>
      </>}
    </TouchableOpacity>

    <TouchableOpacity style={styles.resendBtn} onPress={onResend} disabled={loading}>
      <Text style={styles.resendText}>
        Didn't receive it? <Text style={styles.switchLinkHighlight}>Resend OTP</Text>
      </Text>
    </TouchableOpacity>
  </Animated.View>
));

// ─── SignupDetailsStep ───────────────────────────────────────

interface SignupDetailsStepProps {
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  shakeAnim: Animated.Value;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string;
  onBack: () => void;
  onGoogle: () => void;
  onLogin: () => void;
}

const SignupDetailsStep = React.memo(({
  fadeAnim, slideAnim, shakeAnim,
  name, setName, email, setEmail, phone, setPhone,
  onSubmit, loading, error, onBack, onGoogle, onLogin,
}: SignupDetailsStepProps) => (
  <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
    <BackBtn onPress={onBack} />
    <Text style={styles.cardTitle}>Create account</Text>
    <Text style={styles.cardSub}>
      We'll send a single OTP to both your email and phone to verify your identity
    </Text>

    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
      <InputField
        icon="person-outline" placeholder="Full name"
        value={name} onChangeText={setName}
        autoCapitalize="words"
      />
      <InputField
        icon="mail-outline" placeholder="Email address"
        value={email} onChangeText={setEmail}
        keyboardType="email-address"
      />
      <InputField
        icon="call-outline" placeholder="Phone number (10 digits)"
        value={phone} onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </Animated.View>

    <TouchableOpacity style={styles.primaryBtn} onPress={onSubmit} disabled={loading} activeOpacity={0.85}>
      {loading ? <ActivityIndicator color="#fff" /> : <>
        <Ionicons name="send-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.primaryBtnText}>Send Verification OTP</Text>
      </>}
    </TouchableOpacity>

    <Divider />
    <GoogleBtn onPress={onGoogle} />

    <TouchableOpacity onPress={onLogin} style={styles.switchLink}>
      <Text style={styles.switchLinkText}>
        Already have an account? <Text style={styles.switchLinkHighlight}>Sign in</Text>
      </Text>
    </TouchableOpacity>
  </Animated.View>
));

// ─── SignupOtpStep ───────────────────────────────────────────

interface SignupOtpStepProps {
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
  shakeAnim: Animated.Value;
  otpSentTo: string;
  otpDigits: string[];
  onChange: (val: string, idx: number) => void;
  onKeyPress: (e: any, idx: number) => void;
  otpRefs: React.RefObject<TextInput>[];
  onSubmit: () => void;
  onResend: () => void;
  loading: boolean;
  error: string;
  success: string;
  onBack: () => void;
}

const SignupOtpStep = React.memo(({
  fadeAnim, slideAnim, shakeAnim,
  otpSentTo, otpDigits, onChange, onKeyPress, otpRefs,
  onSubmit, onResend, loading, error, success, onBack,
}: SignupOtpStepProps) => (
  <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
    <BackBtn onPress={onBack} />
    <View style={styles.otpIconRow}>
      <View style={[styles.otpIconCircle, { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)' }]}>
        <Ionicons name="shield-checkmark" size={28} color="#22c55e" />
      </View>
    </View>
    <Text style={styles.cardTitle}>Almost there!</Text>
    <Text style={styles.cardSub}>{otpSentTo}</Text>

    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
      <OtpBoxes
        otpDigits={otpDigits}
        onChange={onChange}
        onKeyPress={onKeyPress}
        refs={otpRefs}
      />
      {!!error && <Text style={[styles.errorText, { textAlign: 'center' }]}>{error}</Text>}
      {!!success && <Text style={[styles.successText, { textAlign: 'center' }]}>{success}</Text>}
    </Animated.View>

    <TouchableOpacity
      style={[styles.primaryBtn, { backgroundColor: '#22c55e', shadowColor: '#22c55e' }]}
      onPress={onSubmit}
      disabled={loading} activeOpacity={0.85}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <>
        <Ionicons name="person-add-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.primaryBtnText}>Create My Account</Text>
      </>}
    </TouchableOpacity>

    <TouchableOpacity style={styles.resendBtn} onPress={onResend} disabled={loading}>
      <Text style={styles.resendText}>
        Didn't receive it? <Text style={styles.switchLinkHighlight}>Resend OTP</Text>
      </Text>
    </TouchableOpacity>
  </Animated.View>
));

// ─── GooglePickerModal (top-level) ───────────────────────────

interface GooglePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAccount: (acc: typeof MOCK_GOOGLE_ACCOUNTS[0]) => void;
  onUseAnother: () => void;
}

const GooglePickerModal = React.memo(({ visible, onClose, onSelectAccount, onUseAnother }: GooglePickerModalProps) => (
  <Modal visible={visible} transparent animationType="slide">
    <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={onClose} />
    <View style={styles.pickerSheet}>
      <View style={styles.pickerHandle} />
      <View style={styles.pickerHeader}>
        <Text style={styles.googleLetters}>
          <Text style={{ color: '#4285F4' }}>G</Text>
          <Text style={{ color: '#EA4335' }}>o</Text>
          <Text style={{ color: '#FBBC05' }}>o</Text>
          <Text style={{ color: '#4285F4' }}>g</Text>
          <Text style={{ color: '#34A853' }}>l</Text>
          <Text style={{ color: '#EA4335' }}>e</Text>
        </Text>
        <Text style={styles.pickerTitle}> — Choose an account</Text>
      </View>
      <Text style={styles.pickerSub}>to continue to WalkSecure</Text>

      {MOCK_GOOGLE_ACCOUNTS.map(acc => (
        <TouchableOpacity key={acc.email} style={styles.pickerItem} onPress={() => onSelectAccount(acc)} activeOpacity={0.7}>
          <View style={[styles.pickerAvatar, { backgroundColor: acc.color }]}>
            <Text style={styles.pickerAvatarText}>{acc.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pickerName}>{acc.name}</Text>
            <Text style={styles.pickerEmail}>{acc.email}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.pickerAddBtn} onPress={onUseAnother}>
        <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
        <Text style={styles.pickerAddText}>Use another account</Text>
      </TouchableOpacity>
    </View>
  </Modal>
));

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();

  const [step, setStep]             = useState<AuthStep>('landing');
  const [loading, setLoading]       = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [otpSentTo, setOtpSentTo]   = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');

  // Signup fields
  const [signupName,  setSignupName]  = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');

  // Google picker
  const [showGooglePicker, setShowGooglePicker] = useState(false);

  // OTP state
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([
    React.createRef<TextInput>(),
    React.createRef<TextInput>(),
    React.createRef<TextInput>(),
    React.createRef<TextInput>(),
    React.createRef<TextInput>(),
    React.createRef<TextInput>(),
  ]).current;

  // Animations
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Animate on step change
  const animateIn = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const navigateTo = useCallback((s: AuthStep) => {
    setErrorMsg('');
    setSuccessMsg('');
    setOtpDigits(['', '', '', '', '', '']);
    setStep(s);
    animateIn();
  }, [animateIn]);

  const finishLogin = useCallback(async (user: any) => {
    await AsyncStorage.setItem('user_token', JSON.stringify(user));
    router.replace('/(tabs)');
  }, [router]);

  // OTP handlers
  const handleOtpChange = useCallback((val: string, idx: number) => {
    const digit = val.replace(/\D/, '');
    setOtpDigits(prev => {
      const next = [...prev];
      next[idx] = digit;
      return next;
    });
    if (digit && idx < 5) {
      otpRefs[idx + 1]?.current?.focus();
    }
  }, [otpRefs]);

  const handleOtpKeyPress = useCallback((e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      otpRefs[idx - 1]?.current?.focus();
    }
  }, [otpDigits, otpRefs]);

  // ─── Auth Handlers ────────────────────────────────────────

  const handleLoginRequest = useCallback(async () => {
    if (!loginEmail || !loginEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.'); triggerShake(); return;
    }
    setLoading(true); setErrorMsg('');
    try {
      const res = await requestOTP(loginEmail.trim().toLowerCase());
      setOtpSentTo(res.message || 'OTP sent to your email and registered phone.');
      navigateTo('login_otp');
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to send OTP.'); triggerShake();
    }
    setLoading(false);
  }, [loginEmail, navigateTo, triggerShake]);

  const handleLoginVerify = useCallback(async () => {
    const otp = otpDigits.join('');
    if (otp.length < 6) {
      setErrorMsg('Please enter the full 6-digit OTP.'); triggerShake(); return;
    }
    setLoading(true); setErrorMsg('');
    try {
      const res = await verifyOTP(loginEmail.trim().toLowerCase(), otp);
      await finishLogin(res.user);
    } catch (e: any) {
      setErrorMsg(e.message || 'Invalid OTP.'); triggerShake();
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs[0]?.current?.focus();
    }
    setLoading(false);
  }, [loginEmail, otpDigits, finishLogin, triggerShake, otpRefs]);

  const handleSignupRequest = useCallback(async () => {
    if (!signupName.trim()) { setErrorMsg('Please enter your full name.'); triggerShake(); return; }
    const emailTrimmed = signupEmail.trim().toLowerCase();
    if (!emailTrimmed.includes('@')) { setErrorMsg('Please enter a valid email address.'); triggerShake(); return; }
    const rawPhone = signupPhone.replace(/[\s\-()]/g, '');
    if (rawPhone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit phone number.'); triggerShake(); return;
    }
    const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+91${rawPhone}`;
    setLoading(true); setErrorMsg('');
    try {
      const res = await signupRequest(signupName.trim(), emailTrimmed, formattedPhone);
      setOtpSentTo(res.message);
      navigateTo('signup_otp');
    } catch (e: any) {
      setErrorMsg(e.message || 'Signup request failed.'); triggerShake();
    }
    setLoading(false);
  }, [signupName, signupEmail, signupPhone, navigateTo, triggerShake]);

  const handleSignupVerify = useCallback(async () => {
    const otp = otpDigits.join('');
    if (otp.length < 6) {
      setErrorMsg('Please enter the full 6-digit OTP.'); triggerShake(); return;
    }
    const emailTrimmed = signupEmail.trim().toLowerCase();
    const rawPhone = signupPhone.replace(/[\s\-()]/g, '');
    const formattedPhone = rawPhone.startsWith('+') ? rawPhone : `+91${rawPhone}`;
    setLoading(true); setErrorMsg('');
    try {
      const res = await signupVerify(emailTrimmed, formattedPhone, otp);
      setSuccessMsg('🎉 Account created! Signing you in…');
      setTimeout(() => finishLogin(res.user), 1000);
    } catch (e: any) {
      setErrorMsg(e.message || 'OTP verification failed.'); triggerShake();
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs[0]?.current?.focus();
    }
    setLoading(false);
  }, [signupEmail, signupPhone, otpDigits, finishLogin, triggerShake, otpRefs]);

  const handleGoogleSignIn = useCallback(async (acc: typeof MOCK_GOOGLE_ACCOUNTS[0]) => {
    setShowGooglePicker(false);
    setLoading(true);
    try {
      const res = await googleAuth(acc.name, acc.email, acc.phone);
      await finishLogin(res.user);
    } catch (e: any) {
      setErrorMsg(e.message || 'Google sign-in failed.');
    }
    setLoading(false);
  }, [finishLogin]);

  const openGooglePicker = useCallback(() => setShowGooglePicker(true), []);
  const closeGooglePicker = useCallback(() => setShowGooglePicker(false), []);

  const goToLanding      = useCallback(() => navigateTo('landing'),        [navigateTo]);
  const goToLoginEmail   = useCallback(() => navigateTo('login_email'),    [navigateTo]);
  const goToLoginOtp     = useCallback(() => navigateTo('login_otp'),      [navigateTo]);
  const goToSignup       = useCallback(() => navigateTo('signup_details'), [navigateTo]);
  const goToSignupOtp    = useCallback(() => navigateTo('signup_otp'),     [navigateTo]);

  const handleGoogleUseAnother = useCallback(() => {
    setShowGooglePicker(false);
    navigateTo('signup_details');
  }, [navigateTo]);

  // ─── Main Render ──────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { minHeight: height }]}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        {/* Background blobs */}
        <View style={[styles.blob, { top: -80,  left: -80 }]} />
        <View style={[styles.blob, { bottom: -60, right: -60, width: 250, height: 250, backgroundColor: '#0f172a' }]} />

        {step === 'landing' && (
          <LandingStep
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            onLoginEmail={goToLoginEmail}
            onSignup={goToSignup}
            onGoogle={openGooglePicker}
          />
        )}

        {step === 'login_email' && (
          <LoginEmailStep
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            shakeAnim={shakeAnim}
            email={loginEmail}
            setEmail={setLoginEmail}
            onSubmit={handleLoginRequest}
            loading={loading}
            error={errorMsg}
            onBack={goToLanding}
            onGoogle={openGooglePicker}
            onSignup={goToSignup}
          />
        )}

        {step === 'login_otp' && (
          <LoginOtpStep
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            shakeAnim={shakeAnim}
            otpSentTo={otpSentTo}
            otpDigits={otpDigits}
            onChange={handleOtpChange}
            onKeyPress={handleOtpKeyPress}
            otpRefs={otpRefs as any}
            onSubmit={handleLoginVerify}
            onResend={handleLoginRequest}
            loading={loading}
            error={errorMsg}
            onBack={goToLoginEmail}
          />
        )}

        {step === 'signup_details' && (
          <SignupDetailsStep
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            shakeAnim={shakeAnim}
            name={signupName}
            setName={setSignupName}
            email={signupEmail}
            setEmail={setSignupEmail}
            phone={signupPhone}
            setPhone={setSignupPhone}
            onSubmit={handleSignupRequest}
            loading={loading}
            error={errorMsg}
            onBack={goToLanding}
            onGoogle={openGooglePicker}
            onLogin={goToLoginEmail}
          />
        )}

        {step === 'signup_otp' && (
          <SignupOtpStep
            fadeAnim={fadeAnim}
            slideAnim={slideAnim}
            shakeAnim={shakeAnim}
            otpSentTo={otpSentTo}
            otpDigits={otpDigits}
            onChange={handleOtpChange}
            onKeyPress={handleOtpKeyPress}
            otpRefs={otpRefs as any}
            onSubmit={handleSignupVerify}
            onResend={handleSignupRequest}
            loading={loading}
            error={errorMsg}
            success={successMsg}
            onBack={goToSignup}
          />
        )}
      </ScrollView>

      <GooglePickerModal
        visible={showGooglePicker}
        onClose={closeGooglePicker}
        onSelectAccount={handleGoogleSignIn}
        onUseAnother={handleGoogleUseAnother}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#020817' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 60 },

  blob: { position: 'absolute', width: 280, height: 280, borderRadius: 140, opacity: 0.2, backgroundColor: '#1d4ed8' },

  card: {
    width: '100%', maxWidth: 420,
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderRadius: 28, padding: 28,
    borderWidth: 1, borderColor: 'rgba(51,65,85,0.8)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5, shadowRadius: 40, elevation: 20,
  },

  logoRow:    { alignItems: 'center', marginBottom: 14 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 20, elevation: 12,
  },
  appName: { textAlign: 'center', fontSize: 30, fontWeight: '900', color: '#f8fafc', letterSpacing: 0.5 },
  tagline: { textAlign: 'center', fontSize: 14, color: '#64748b', marginBottom: 28, marginTop: 4 },

  cardTitle: { fontSize: 24, fontWeight: '800', color: '#f8fafc', marginBottom: 6 },
  cardSub:   { fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 20 },

  otpIconRow:    { alignItems: 'center', marginBottom: 14 },
  otpIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },

  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 8 },
  otpBox: {
    flex: 1, aspectRatio: 1, borderRadius: 14,
    backgroundColor: 'rgba(30,41,59,0.9)',
    borderWidth: 1.5, borderColor: '#334155',
    color: '#f8fafc', fontSize: 22, fontWeight: '700', textAlign: 'center',
  },
  otpBoxFilled: { borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)' },

  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(30,41,59,0.9)',
    borderRadius: 14, borderWidth: 1.5, borderColor: '#334155',
    marginBottom: 12, paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 52, color: '#f8fafc', fontSize: 15 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#3b82f6', borderRadius: 14,
    paddingVertical: 15, marginTop: 4,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  ghostBtn: {
    borderRadius: 14, paddingVertical: 14, marginTop: 10,
    borderWidth: 1.5, borderColor: '#334155', alignItems: 'center',
  },
  ghostBtnText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  googleIcon: { marginRight: 10 },
  googleLetters: { fontSize: 16, fontWeight: '700' },
  googleBtnText: { color: '#1f2937', fontSize: 15, fontWeight: '700' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1e293b' },
  dividerText: { marginHorizontal: 12, color: '#475569', fontSize: 13 },

  errorText:   { color: '#f87171', fontSize: 13, marginTop: 4, marginBottom: 4 },
  successText: { color: '#4ade80', fontSize: 13, marginTop: 4, marginBottom: 4 },

  backBtn:     { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtnText: { color: '#94a3b8', fontSize: 14, marginLeft: 6 },

  switchLink:          { marginTop: 20, alignItems: 'center' },
  switchLinkText:      { color: '#64748b', fontSize: 14 },
  switchLinkHighlight: { color: '#3b82f6', fontWeight: '700' },

  resendBtn:  { marginTop: 16, alignItems: 'center' },
  resendText: { color: '#64748b', fontSize: 14 },

  legalText: { color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 24, lineHeight: 16 },
  legalLink: { color: '#3b82f6' },

  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  pickerSheet: {
    backgroundColor: '#0f172a', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    borderTopWidth: 1, borderColor: '#1e293b',
  },
  pickerHandle: { width: 40, height: 4, backgroundColor: '#334155', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  pickerTitle:  { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  pickerSub:    { fontSize: 13, color: '#64748b', marginBottom: 20 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  pickerAvatar:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  pickerAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  pickerName:  { fontSize: 15, fontWeight: '600', color: '#f1f5f9' },
  pickerEmail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  pickerAddBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  pickerAddText: { color: '#3b82f6', fontSize: 14, fontWeight: '600', marginLeft: 10 },
});
