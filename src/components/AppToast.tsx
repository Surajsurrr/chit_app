import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';

export interface AppToastProps {
  visible: boolean;
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'info';
  onDismiss: () => void;
  durationMs?: number;
}

export const AppToast: React.FC<AppToastProps> = ({
  visible,
  title,
  message,
  type = 'success',
  onDismiss,
  durationMs = 3000,
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 20,
          useNativeDriver: true,
          tension: 80,
          friction: 9,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, durationMs);

      return () => clearTimeout(timer);
    } else {
      handleDismiss();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[
          styles.toastContainer,
          type === 'error' ? styles.toastError : styles.toastSuccess,
        ]}
        onPress={handleDismiss}
        activeOpacity={0.9}
      >
        <View
          style={[
            styles.iconBadge,
            type === 'error' ? styles.iconBadgeError : styles.iconBadgeSuccess,
          ]}
        >
          <Text style={styles.iconBadgeText}>{getIcon()}</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>{title}</Text>
          {message ? <Text style={styles.messageText}>{message}</Text> : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 24 : 48,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999999,
    pointerEvents: 'box-none',
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    maxWidth: 440,
    width: '92%',
    borderWidth: 1,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
        } as any)
      : SHADOWS.lg),
  },
  toastSuccess: {
    backgroundColor: '#0F172A',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  toastError: {
    backgroundColor: '#7F1D1D',
    borderColor: '#EF4444',
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBadgeSuccess: {
    backgroundColor: '#10B981',
  },
  iconBadgeError: {
    backgroundColor: '#DC2626',
  },
  iconBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  textContainer: {
    flex: 1,
  },
  titleText: {
    ...TYPOGRAPHY.captionBold,
    color: '#FFFFFF',
    fontSize: 14,
  },
  messageText: {
    ...TYPOGRAPHY.caption,
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
});

export default AppToast;
