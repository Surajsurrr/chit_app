import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../constants/theme';
import { Scheme } from '../data/mockData';
import { formatFrequency } from '../utils/dateHelpers';

interface AvailSchemeModalProps {
  visible: boolean;
  scheme: Scheme | null;
  onClose: () => void;
  onConfirm: (scheme: Scheme) => Promise<void>;
  isLoading: boolean;
  successScheme: Scheme | null;
  onSuccessDone: () => void;
  isProfileIncomplete?: boolean;
  onNavigateProfile?: () => void;
}

export const AvailSchemeModal: React.FC<AvailSchemeModalProps> = ({
  visible,
  scheme,
  onClose,
  onConfirm,
  isLoading,
  successScheme,
  onSuccessDone,
  isProfileIncomplete,
  onNavigateProfile,
}) => {
  if (!visible) return null;

  // Render Success Celebration View
  if (successScheme) {
    const interest = successScheme.interestAmount || 0;
    const payout = successScheme.payoutAmount || Math.max(0, successScheme.totalAmount - interest);

    return (
      <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onSuccessDone}>
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Text style={styles.successIcon}>🎉</Text>
            </View>

            <Text style={styles.successTitle}>Scheme Availed Successfully!</Text>
            <Text style={styles.successSubtitle}>
              You have successfully enrolled in{' '}
              <Text style={{ fontWeight: '700', color: COLORS.primary }}>
                "{successScheme.name}"
              </Text>
              .
            </Text>

            <View style={styles.successDetailsBox}>
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>Total Chit Value</Text>
                <Text style={styles.successDetailVal}>₹{successScheme.totalAmount.toLocaleString('en-IN')}</Text>
              </View>
              <View style={[styles.successDetailRow, styles.successHighlightRow]}>
                <Text style={styles.successHighlightLabel}>Net Upfront Payout</Text>
                <Text style={styles.successHighlightVal}>₹{payout.toLocaleString('en-IN')}</Text>
              </View>
              <View style={[styles.successDetailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.successDetailLabel}>Installment Schedule</Text>
                <Text style={styles.successDetailVal}>
                  ₹{successScheme.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(successScheme.frequency)}
                </Text>
              </View>
            </View>

            <View style={styles.adminSyncNotice}>
              <Text style={styles.adminSyncIcon}>✓</Text>
              <Text style={styles.adminSyncText}>
                Synced with Administrator Dashboard. Your enrollment terms are now locked forever.
              </Text>
            </View>

            <TouchableOpacity style={styles.successDoneBtn} onPress={onSuccessDone} activeOpacity={0.85}>
              <Text style={styles.successDoneBtnText}>View My Dashboard →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Render Profile Incomplete Advisory View if needed
  if (isProfileIncomplete && onNavigateProfile) {
    return (
      <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.incompleteCard}>
            <View style={styles.incompleteIconCircle}>
              <Text style={styles.incompleteIcon}>📝</Text>
            </View>

            <Text style={styles.incompleteTitle}>Profile Setup Required</Text>
            <Text style={styles.incompleteDesc}>
              Before availing a chit scheme, you must complete your profile details (including your Email address and Residential Address) in your Member Profile.
            </Text>

            <View style={styles.incompleteActionCol}>
              <TouchableOpacity
                style={styles.completeProfileBtn}
                onPress={() => {
                  onClose();
                  onNavigateProfile();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.completeProfileBtnText}>Complete Profile Now →</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (!scheme) return null;

  const interest = scheme.interestAmount || 0;
  const interestRate = scheme.totalAmount > 0 ? ((interest / scheme.totalAmount) * 100).toFixed(1) : '0';
  const payout = scheme.payoutAmount || Math.max(0, scheme.totalAmount - interest);

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalHeaderTitle}>Confirm Scheme Enrollment</Text>
              <Text style={styles.modalHeaderSubtitle}>Review your scheme parameters before confirming</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Scheme Name & Tag Banner */}
            <View style={styles.schemeBannerCard}>
              <View style={styles.schemeBannerBadge}>
                <Text style={styles.schemeBannerBadgeText}>ACTIVE SELECTION</Text>
              </View>
              <Text style={styles.schemeBannerName}>🪙 {scheme.name}</Text>
              <Text style={styles.schemeBannerSubtitle}>
                ₹{scheme.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(scheme.frequency)} ({scheme.durationWeeksOrMonths} installments)
              </Text>
            </View>

            {/* Financial Parameters Breakdown */}
            <View style={styles.breakdownCard}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Total Scheme Value</Text>
                <Text style={styles.breakdownVal}>₹{scheme.totalAmount.toLocaleString('en-IN')}</Text>
              </View>

              {interest > 0 ? (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Upfront Interest Deduction</Text>
                  <Text style={styles.breakdownInterest}>- ₹{interest.toLocaleString('en-IN')} ({interestRate}%)</Text>
                </View>
              ) : null}

              <View style={[styles.breakdownRow, styles.payoutRow]}>
                <View>
                  <Text style={styles.payoutLabel}>Net Upfront Payout Received</Text>
                  <Text style={styles.payoutSub}>Disbursed upfront upon confirmation</Text>
                </View>
                <Text style={styles.payoutVal}>₹{payout.toLocaleString('en-IN')}</Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Scheduled Installment</Text>
                <Text style={styles.breakdownVal}>
                  ₹{scheme.collectionAmount.toLocaleString('en-IN')} / {formatFrequency(scheme.frequency)}
                </Text>
              </View>

              <View style={[styles.breakdownRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.breakdownLabel}>Duration / Collections</Text>
                <Text style={styles.breakdownVal}>{scheme.durationWeeksOrMonths} installments</Text>
              </View>
            </View>

            {/* Permanent Guarantee Badge */}
            <View style={styles.contractGuaranteeBox}>
              <Text style={styles.contractIcon}>🔒</Text>
              <View style={{ flex: 1, marginLeft: SPACING.xs + 2 }}>
                <Text style={styles.contractTitle}>Agreed Terms Locked Permanently</Text>
                <Text style={styles.contractDesc}>
                  Once confirmed, these payout terms and installment amounts are fixed for the entirety of your agreement. Future changes by admin will never affect your contract.
                </Text>
              </View>
            </View>

            <View style={styles.adminNotificationNotice}>
              <Text style={styles.adminNotificationIcon}>ℹ️</Text>
              <Text style={styles.adminNotificationText}>
                Your enrollment details, contact info, and repayment progress will be displayed directly on the Administrator Dashboard.
              </Text>
            </View>

            {/* Modal Actions */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.cancelActionBtn}
                onPress={onClose}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelActionBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmActionBtn, isLoading && styles.confirmActionBtnDisabled]}
                onPress={() => onConfirm(scheme)}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <View style={styles.btnLoadingRow}>
                    <ActivityIndicator color={COLORS.white} size="small" />
                    <Text style={styles.confirmActionBtnText}>Enrolling...</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmActionBtnText}>Confirm & Avail Scheme →</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    fontSize: 17,
  },
  modalHeaderSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  closeBtnText: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  modalScroll: {
    padding: SPACING.lg,
  },
  schemeBannerCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  schemeBannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: SPACING.xs,
  },
  schemeBannerBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  schemeBannerName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
    fontSize: 18,
  },
  schemeBannerSubtitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#93C5FD',
    marginTop: 4,
    fontWeight: '600',
  },
  breakdownCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  breakdownLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
  },
  breakdownVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
  },
  breakdownInterest: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#D97706',
  },
  payoutRow: {
    backgroundColor: '#ECFDF5',
    marginHorizontal: -SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0',
    borderBottomColor: '#A7F3D0',
  },
  payoutLabel: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#065F46',
    fontSize: 13,
  },
  payoutSub: {
    ...TYPOGRAPHY.caption,
    color: '#047857',
    fontSize: 10,
    marginTop: 1,
  },
  payoutVal: {
    ...TYPOGRAPHY.h2,
    color: '#047857',
    fontSize: 18,
    fontWeight: '800',
  },
  contractGuaranteeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  contractIcon: {
    fontSize: 20,
  },
  contractTitle: {
    ...TYPOGRAPHY.captionBold,
    color: '#0F172A',
    fontSize: 11,
  },
  contractDesc: {
    ...TYPOGRAPHY.caption,
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  adminNotificationNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.lg,
  },
  adminNotificationIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  adminNotificationText: {
    ...TYPOGRAPHY.caption,
    color: '#1E40AF',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  cancelActionBtn: {
    flex: 1,
    paddingVertical: SPACING.md - 2,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.textMuted,
  },
  confirmActionBtn: {
    flex: 2,
    backgroundColor: COLORS.success,
    paddingVertical: SPACING.md - 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  confirmActionBtnDisabled: {
    opacity: 0.7,
  },
  confirmActionBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
    fontSize: 14,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },

  // Success Modal Styles
  successCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginHorizontal: SPACING.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginVertical: 'auto',
    ...SHADOWS.lg,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  successIcon: {
    fontSize: 32,
  },
  successTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    textAlign: 'center',
    fontSize: 19,
  },
  successSubtitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  successDetailsBox: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  successDetailLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
  },
  successDetailVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
  },
  successHighlightRow: {
    backgroundColor: '#ECFDF5',
    marginHorizontal: -SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  successHighlightLabel: {
    ...TYPOGRAPHY.captionBold,
    color: '#065F46',
  },
  successHighlightVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#047857',
  },
  adminSyncNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: SPACING.lg,
    width: '100%',
  },
  adminSyncIcon: {
    color: '#047857',
    fontWeight: 'bold',
    marginRight: 6,
  },
  adminSyncText: {
    ...TYPOGRAPHY.captionBold,
    color: '#065F46',
    fontSize: 11,
    flex: 1,
  },
  successDoneBtn: {
    backgroundColor: COLORS.success,
    width: '100%',
    paddingVertical: SPACING.md - 2,
    borderRadius: 12,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  successDoneBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
    fontSize: 14,
  },

  // Incomplete Profile Modal Styles
  incompleteCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginHorizontal: SPACING.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginVertical: 'auto',
    ...SHADOWS.lg,
  },
  incompleteIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  incompleteIcon: {
    fontSize: 28,
  },
  incompleteTitle: {
    ...TYPOGRAPHY.h3,
    color: '#92400E',
    textAlign: 'center',
  },
  incompleteDesc: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  incompleteActionCol: {
    width: '100%',
    gap: SPACING.sm,
  },
  completeProfileBtn: {
    backgroundColor: COLORS.secondary,
    paddingVertical: SPACING.md - 2,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeProfileBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
  },
  cancelBtn: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  cancelBtnText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
  },
});

export default AvailSchemeModal;
