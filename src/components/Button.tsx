import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const getButtonStyles = (): StyleProp<ViewStyle> => {
    switch (variant) {
      case 'secondary':
        return [styles.btn, styles.secondaryBtn];
      case 'success':
        return [styles.btn, styles.successBtn];
      case 'danger':
        return [styles.btn, styles.dangerBtn];
      case 'outline':
        return [styles.btn, styles.outlineBtn];
      case 'primary':
      default:
        return [styles.btn, styles.primaryBtn];
    }
  };

  const getTextStyle = (): StyleProp<TextStyle> => {
    switch (variant) {
      case 'outline':
        return [styles.btnText, styles.outlineText, TYPOGRAPHY.bodyMediumBold];
      default:
        return [styles.btnText, styles.filledText, TYPOGRAPHY.bodyMediumBold];
    }
  };

  const getSizeStyle = (): StyleProp<ViewStyle> => {
    switch (size) {
      case 'small':
        return { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md };
      case 'large':
        return { paddingVertical: SPACING.md + 4, paddingHorizontal: SPACING.xl };
      case 'medium':
      default:
        return { paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg };
    }
  };

  return (
    <TouchableOpacity
      style={[
        getButtonStyles(),
        getSizeStyle(),
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? COLORS.secondary : COLORS.white}
          size="small"
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryBtn: {
    backgroundColor: COLORS.secondary,
  },
  secondaryBtn: {
    backgroundColor: COLORS.primary,
  },
  successBtn: {
    backgroundColor: COLORS.success,
  },
  dangerBtn: {
    backgroundColor: COLORS.danger,
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
  },
  btnText: {
    textAlign: 'center',
  },
  filledText: {
    color: COLORS.white,
  },
  outlineText: {
    color: COLORS.secondary,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Button;
