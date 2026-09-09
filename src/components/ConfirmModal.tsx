import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  warningNote?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  icon?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  warningNote,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = true,
  icon = '🗑️',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={isLoading ? undefined : onCancel}
    >
      <TouchableWithoutFeedback onPress={isLoading ? undefined : onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.dialogCard}>
              {/* Icon Badge */}
              <View
                style={[
                  styles.iconCircle,
                  isDestructive ? styles.iconCircleDestructive : styles.iconCircleNeutral,
                ]}
              >
                <Text style={styles.iconText}>{icon}</Text>
              </View>

              {/* Title & Description */}
              <Text style={styles.titleText}>{title}</Text>
              {message ? <Text style={styles.messageText}>{message}</Text> : null}

              {/* Warning Highlight Box */}
              {warningNote ? (
                <View style={styles.warningBox}>
                  <Text style={styles.warningBoxText}>{warningNote}</Text>
                </View>
              ) : null}

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onCancel}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>{cancelText}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    isDestructive ? styles.confirmButtonDestructive : styles.confirmButtonPrimary,
                    isLoading && styles.confirmButtonDisabled,
                  ]}
                  onPress={onConfirm}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.confirmButtonText}>{confirmText}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(6px)',
          userSelect: 'none',
        } as any)
      : {}),
  },
  dialogCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        } as any)
      : SHADOWS.lg),
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  iconCircleDestructive: {
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: '#FECACA',
  },
  iconCircleNeutral: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  iconText: {
    fontSize: 28,
  },
  titleText: {
    ...TYPOGRAPHY.h2,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.xs + 2,
    letterSpacing: -0.3,
  },
  messageText: {
    ...TYPOGRAPHY.bodyMedium,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  warningBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  warningBoxText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    lineHeight: 18,
    color: '#B91C1C',
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm + 4,
    width: '100%',
    marginTop: SPACING.xs,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          transition: 'all 0.15s ease-in-out',
        } as any)
      : {}),
  },
  cancelButtonText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 14,
    color: '#475569',
  },
  confirmButton: {
    flex: 1.2,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          transition: 'all 0.15s ease-in-out',
        } as any)
      : {}),
  },
  confirmButtonDestructive: {
    backgroundColor: '#DC2626',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.28)',
        } as any)
      : SHADOWS.sm),
  },
  confirmButtonPrimary: {
    backgroundColor: COLORS.secondary,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.28)',
        } as any)
      : SHADOWS.sm),
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 14,
    color: COLORS.white,
  },
});

export default ConfirmModal;
