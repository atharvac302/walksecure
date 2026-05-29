import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const logoScale    = useRef(new Animated.Value(0.3)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const ringScale1   = useRef(new Animated.Value(0)).current;
  const ringOpacity1 = useRef(new Animated.Value(0.8)).current;
  const ringScale2   = useRef(new Animated.Value(0)).current;
  const ringOpacity2 = useRef(new Animated.Value(0.5)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const textSlide    = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Logo pops in
    Animated.parallel([
      Animated.spring(logoScale,   { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start(() => {
      // 2. Rings pulse outward
      Animated.parallel([
        Animated.timing(ringScale1,   { toValue: 3.5, duration: 800, useNativeDriver: true }),
        Animated.timing(ringOpacity1, { toValue: 0,   duration: 800, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(ringScale2,   { toValue: 3.5, duration: 800, useNativeDriver: true }),
          Animated.timing(ringOpacity2, { toValue: 0,   duration: 800, useNativeDriver: true }),
        ]),
      ]).start();
      // 3. Text fades in
      Animated.parallel([
        Animated.timing(textOpacity,    { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }),
        Animated.timing(textSlide,      { toValue: 0, duration: 500, delay: 300, useNativeDriver: true }),
        Animated.timing(taglineOpacity, { toValue: 1, duration: 600, delay: 600, useNativeDriver: true }),
      ]).start();

      // 4. After 2.5s, fade out and complete
      setTimeout(() => {
        Animated.timing(screenOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(onComplete);
      }, 2200);
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background gradient circles */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* Pulse rings */}
      <Animated.View style={[styles.ring, {
        transform: [{ scale: ringScale1 }], opacity: ringOpacity1
      }]} />
      <Animated.View style={[styles.ring, styles.ring2, {
        transform: [{ scale: ringScale2 }], opacity: ringOpacity2
      }]} />

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, {
        transform: [{ scale: logoScale }], opacity: logoOpacity
      }]}>
        <Ionicons name="shield-checkmark" size={52} color="#fff" />
      </Animated.View>

      {/* App name */}
      <Animated.Text style={[styles.appName, {
        opacity: textOpacity, transform: [{ translateY: textSlide }]
      }]}>
        WalkSecure
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Your personal safety companion
      </Animated.Text>

      {/* Bottom powered by */}
      <Animated.Text style={[styles.poweredBy, { opacity: taglineOpacity }]}>
        Powered by AI • Real-time Safety Intelligence
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#1a56db',
    alignItems: 'center', justifyContent: 'center',
  },
  bgCircle1: {
    position: 'absolute', width: width * 1.4, height: width * 1.4,
    borderRadius: width * 0.7, backgroundColor: '#1d4ed8',
    top: -width * 0.5, left: -width * 0.2, opacity: 0.5,
  },
  bgCircle2: {
    position: 'absolute', width: width * 1.2, height: width * 1.2,
    borderRadius: width * 0.6, backgroundColor: '#1e40af',
    bottom: -width * 0.6, right: -width * 0.2, opacity: 0.4,
  },
  ring: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
  },
  ring2: { borderColor: 'rgba(255,255,255,0.4)' },
  logoWrap: {
    width: 100, height: 100, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
  },
  appName: {
    fontSize: 38, fontWeight: '900', color: '#fff',
    letterSpacing: 0.5, marginBottom: 10,
  },
  tagline: {
    fontSize: 15, color: 'rgba(255,255,255,0.8)',
    fontWeight: '500', letterSpacing: 0.3,
  },
  poweredBy: {
    position: 'absolute', bottom: 48,
    fontSize: 11, color: 'rgba(255,255,255,0.5)',
    fontWeight: '500', letterSpacing: 0.5,
  },
});
