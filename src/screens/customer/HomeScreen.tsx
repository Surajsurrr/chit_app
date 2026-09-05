import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import TransactionRow from '../../components/TransactionRow';
import { formatDateLong, formatDateShort, getPaymentStatusInfo, formatFrequency } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';
import { Scheme } from '../../data/mockData';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    selectedCustomerId,
    customers,
    payments,
    receipts,
    schemes,
    getCustomerStats,
    updateCustomerScheme,
    logout,
    isAdminProfileComplete,
    isCustomerProfileComplete,
    currentAdmin,
  } = useChitData();

  const customer = customers.find((c) => c.id === selectedCustomerId);

  if (!customer) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Customer account not selected.</Text>
        <Button title="Log Out" onPress={() => logout()} />
      </SafeAreaView>
    );
  }

  const isCustProfileComplete = isCustomerProfileComplete(customer.id);
  const hasAvailedScheme = Boolean(
    (customer.schemeId && customer.schemeId.trim() !== '') ||
    (customer.enrolledSchemes && customer.enrolledSchemes.length > 0)
  );
  const scheme = hasAvailedScheme ? schemes.find((s) => s.id === customer.schemeId) : null;
  const enrolledSnapshot = hasAvailedScheme
    ? (customer.enrolledSchemes?.find((es) => es.schemeId === customer.schemeId)
      || customer.enrolledSchemes?.[customer.enrolledSchemes.length - 1])
    : null;
  const activeSchemeName = enrolledSnapshot?.schemeName || scheme?.name || 'No Scheme Availed';
  const activeSchemeValue = enrolledSnapshot?.totalAmount || customer.amountGiven || 0;
  const activeInterest = enrolledSnapshot?.interestAmount ?? scheme?.interestAmount ?? 0;
  const activePayout = enrolledSnapshot?.payoutAmount ?? (scheme?.payoutAmount ?? Math.max(0, activeSchemeValue - activeInterest));

  const stats = getCustomerStats(customer.id);
  const customerPayments = payments.filter((p) => p.customerId === customer.id);
  const recentPayments = customerPayments.slice(0, 3); // top 3
  const latestPayment = customerPayments.length > 0 ? customerPayments[0] : null;
  const latestReceipt = latestPayment
    ? receipts.find((r) => r.paymentId === latestPayment.id || r.id === latestPayment.receiptId)
    : null;
  const statusInfo = getPaymentStatusInfo(customer.nextPaymentDate, stats.remainingAmount, customer.frequency);
  const isOverdue = hasAvailedScheme && statusInfo.isOverdue;

  const handleSelectScheme = (selectedScheme: Scheme) => {
    if (hasAvailedScheme && selectedScheme.id === customer.schemeId) return;

    // 1. Mandatory Admin Profile Setup Check
    if (!isAdminProfileComplete) {
      Alert.alert(
        'Schemes Unavailable 🔒',
        'The chit fund organizer has not completed their profile setup yet. Schemes cannot be chosen until the organizer sets up their profile.'
      );
      return;
    }

    // 2. Mandatory Customer Profile Setup Check
    if (!isCustProfileComplete) {
      Alert.alert(
        'Profile Setup Required 📝',
        'You must complete your profile details (including Email and Residential Address) before choosing or enrolling in a scheme.\n\nTap "Complete Profile" to update your details now.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete Profile', onPress: () => navigation.navigate('Profile') },
        ]
      );
      return;
    }

    const interest = selectedScheme.interestAmount || 0;
    const payout = selectedScheme.payoutAmount || (selectedScheme.totalAmount - interest);

    Alert.alert(
      'Enroll in Scheme',
      `Would you like to choose "${selectedScheme.name}" as your active scheme?\n\n• Total Scheme Value: ₹${selectedScheme.totalAmount.toLocaleString('en-IN')}\n• Upfront Net Payout: ₹${payout.toLocaleString('en-IN')}\n• Repayment: ₹${selectedScheme.collectionAmount.toLocaleString('en-IN')} (${formatFrequency(selectedScheme.frequency)})\n• Duration: ${selectedScheme.durationWeeksOrMonths} installments`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Enroll',
          onPress: async () => {
            const res = await updateCustomerScheme(customer.id, selectedScheme.id);
            if (res.success) {
              Alert.alert(
                'Scheme Updated! 🎉',
                `You have successfully enrolled in "${selectedScheme.name}". Your dashboard has been updated with the new scheme parameters.`
              );
            } else {
              Alert.alert('Error', res.error || 'Failed to update scheme');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    logout();
  };

  const nameInitials = customer.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: SPACING.sm }}>
          <Text style={styles.welcomeText}>WELCOME BACK</Text>
          <Text style={styles.customerName} numberOfLines={1}>{customer.name}</Text>
        </View>
        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>{nameInitials}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerLogoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text style={styles.headerLogoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Latest Payment Verified & Invoice Proof Card */}
        {latestPayment && (
          <Card style={styles.latestInvoiceCard}>
            <View style={styles.latestInvoiceHeader}>
              <View style={styles.latestInvoiceBadge}>
                <Text style={styles.latestInvoiceBadgeText}>✓ LATEST PAYMENT CREDITED</Text>
              </View>
              <Text style={styles.latestInvoiceDate}>
                {formatDateLong(latestPayment.date)}
              </Text>
            </View>

            <View style={styles.latestInvoiceRow}>
              <View style={styles.latestInvoiceInfo}>
                <Text style={styles.latestInvoiceAmount}>
                  ₹{latestPayment.amount.toLocaleString('en-IN')}
                </Text>
                <Text style={styles.latestInvoiceSub}>
                  Paid via {latestPayment.method} · {latestReceipt ? latestReceipt.receiptNumber : 'Verified'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.latestInvoiceBtn}
                onPress={() => {
                  if (latestReceipt) {
                    navigation.navigate('ReceiptDetail', {
                      receiptId: latestReceipt.id,
                      autoDownload: true,
                    });
                  } else {
                    navigation.navigate('Receipts');
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.latestInvoiceBtnIcon}>📥</Text>
                <Text style={styles.latestInvoiceBtnText}>Download Invoice (PDF)</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Next Payment Card or Onboarding Prompt */}
        {!hasAvailedScheme ? (
          <Card style={styles.noSchemeHeroCard}>
            <View style={styles.noSchemeHeroHeader}>
              <View style={styles.noSchemeHeroBadge}>
                <Text style={styles.noSchemeHeroBadgeText}>📋 GET STARTED</Text>
              </View>
              <Text style={styles.noSchemeHeroStep}>
                {!isCustProfileComplete ? 'Step 1: Setup Profile' : 'Step 2: Choose Scheme'}
              </Text>
            </View>
            <Text style={styles.noSchemeHeroTitle}>No Scheme Availed Yet</Text>
            <Text style={styles.noSchemeHeroDesc}>
              {!isCustProfileComplete
                ? 'Mandatory Requirement: Please complete your profile details (Email and Residential Address) in the Profile tab to unlock scheme enrollment.'
                : 'Your profile is verified! Select an organizer chit scheme below to avail your net payout and start saving.'}
            </Text>
            <TouchableOpacity
              style={styles.noSchemeHeroBtn}
              onPress={() => {
                if (!isCustProfileComplete) {
                  navigation.navigate('Profile');
                } else {
                  navigation.navigate('MySchemes');
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.noSchemeHeroBtnText}>
                {!isCustProfileComplete ? 'Complete Profile Setup →' : 'Explore & Avail Schemes →'}
              </Text>
            </TouchableOpacity>
          </Card>
        ) : stats.remainingAmount > 0 ? (
          <Card style={[styles.nextPayCard, isOverdue ? styles.overdueNextPayCard : styles.upToDateNextPayCard]}>
            {isOverdue ? (
              <>
                <View style={styles.overdueHeaderBadge}>
                  <Text style={styles.overdueHeaderBadgeText}>⚠️ MISSED INSTALLMENT OVERDUE</Text>
                </View>
                <Text style={[styles.nextPayLabel, styles.overdueNextPayLabel]}>
                  MISSED INSTALLMENT DUE
                </Text>
                <Text style={[styles.nextPayDate, styles.overdueNextPayDate]}>
                  {formatDateLong(customer.nextPaymentDate)}
                </Text>
                <Text style={[styles.nextPayDetails, styles.overdueNextPayDetails]}>
                  ₹{customer.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(customer.frequency)} ({statusInfo.statusText})
                </Text>

                <View style={styles.overdueWarningBox}>
                  <Text style={styles.overdueWarningTitle}>⚠️ PAYMENT DUE DATE HAS CROSSED</Text>
                  <Text style={styles.overdueWarningText}>
                    Your installment of ₹{customer.collectionAmount.toLocaleString('en-IN')} is overdue. Please pay directly to the Admin / Collector to update your payment status.
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.upToDateHeaderBadge}>
                  <Text style={styles.upToDateHeaderBadgeText}>✓ UP TO DATE — NO OVERDUE</Text>
                </View>
                <Text style={styles.upToDateNextPayLabel}>NEXT PAYMENT DUE</Text>
                <Text style={styles.upToDateNextPayDate}>{formatDateLong(customer.nextPaymentDate)}</Text>
                <Text style={styles.upToDateNextPayDetails}>
                  ₹{customer.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(customer.frequency)}
                </Text>

                <View style={styles.upToDateAdminCollectionBadge}>
                  <Text style={styles.upToDateAdminCollectionText}>
                    📌 Installments are collected & recorded directly by Admin
                  </Text>
                </View>
              </>
            )}
          </Card>
        ) : (
          <Card style={[styles.nextPayCard, styles.settledCard]}>
            <Text style={styles.settledTextTitle}>✓ Account Fully Settled</Text>
            <Text style={styles.settledTextDesc}>
              You have completed all installments for this scheme. Congratulations!
            </Text>
          </Card>
        )}

        {/* My Active Chit Scheme Section */}
        <Text style={styles.sectionTitle}>My Chit Scheme & Payout Details</Text>
        {!hasAvailedScheme ? (
          <Card style={styles.emptySchemeCard}>
            <View style={styles.emptySchemeIconBox}>
              <Text style={styles.emptySchemeIcon}>🪙</Text>
            </View>
            <Text style={styles.emptySchemeTitle}>No Scheme Availed Yet</Text>
            <Text style={styles.emptySchemeText}>
              In the beginning, no scheme is assigned to your account. Complete your profile setup and select a scheme from the available list below to avail your net payout.
            </Text>
          </Card>
        ) : (
          <Card style={styles.schemeCard}>
          <View style={styles.lockedTermsHeader}>
            <Text style={styles.lockedTermsIcon}>🔒</Text>
            <View style={{ flex: 1, marginLeft: SPACING.xs }}>
              <Text style={styles.lockedTermsTitle}>PERMANENT CONTRACT TERMS</Text>
              <Text style={styles.lockedTermsSub}>
                Agreed at enrollment ({formatDateShort(enrolledSnapshot?.enrolledAt || customer.startDate)}) · Protected forever
              </Text>
            </View>
          </View>

          <View style={styles.schemeRow}>
            <Text style={styles.schemeLabel}>Scheme Name</Text>
            <Text style={styles.schemeVal}>{activeSchemeName}</Text>
          </View>
          <View style={styles.schemeRow}>
            <Text style={styles.schemeLabel}>Total Scheme Value</Text>
            <Text style={styles.schemeVal}>₹{activeSchemeValue.toLocaleString('en-IN')}</Text>
          </View>
          {activeInterest > 0 ? (
            <View style={styles.schemeRow}>
              <Text style={styles.schemeLabel}>Upfront Interest Deduction</Text>
              <Text style={styles.schemeInterestVal}>
                - ₹{activeInterest.toLocaleString('en-IN')} ({((activeInterest / activeSchemeValue) * 100).toFixed(1)}% rate)
              </Text>
            </View>
          ) : null}
          <View style={[styles.schemeRow, styles.schemeHighlightRow]}>
            <Text style={styles.schemeHighlightLabel}>Net Amount Received (Payout)</Text>
            <Text style={styles.schemeHighlightVal}>
              ₹{activePayout.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.schemeRow}>
            <Text style={styles.schemeLabel}>Installment Schedule</Text>
            <Text style={styles.schemeVal}>
              ₹{customer.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(customer.frequency)}
            </Text>
          </View>

          {/* Customer Explanation Note */}
          <View style={styles.customerNoticeBox}>
            <Text style={styles.noticeIcon}>ℹ️</Text>
<Text style={styles.noticeText}>
              {scheme?.description ||
                `You receive a net payout of ₹${activePayout.toLocaleString('en-IN')} upfront (after ₹${activeInterest.toLocaleString('en-IN')} interest deduction), and repay ₹${activeSchemeValue.toLocaleString('en-IN')} across scheduled installments.`}
              {'\n'}• Your enrolled terms are locked forever. Future modifications by admin to general scheme templates will never affect your agreement.
            </Text>
          </View>
        </Card>
      )}

        {/* Available Admin Schemes Section */}
        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Available Admin Schemes</Text>
          <Text style={styles.sectionSubtitle}>
            {isAdminProfileComplete
              ? 'Choose or switch to any scheme offered by the organizer'
              : 'Schemes visibility locked until organizer completes profile setup'}
          </Text>
        </View>

        {!isAdminProfileComplete ? (
          <Card style={styles.lockedCard}>
            <View style={styles.lockedIconBox}>
              <Text style={styles.lockedIcon}>🔒</Text>
            </View>
            <Text style={styles.lockedTitle}>Chit Schemes Unavailable</Text>
            <Text style={styles.lockedText}>
              The chit fund organizer has not completed their mandatory profile setup yet. Schemes will become visible once the administrator completes their verified organizer profile.
            </Text>
            <View style={styles.lockedBadge}>
              <Text style={styles.lockedBadgeText}>Organizer Setup Pending</Text>
            </View>
          </Card>
        ) : (
          <>
            {!isCustProfileComplete && (
              <TouchableOpacity
                style={styles.customerIncompleteBanner}
                onPress={() => navigation.navigate('Profile')}
                activeOpacity={0.85}
              >
                <Text style={styles.customerIncompleteIcon}>⚠️</Text>
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <Text style={styles.customerIncompleteTitle}>Profile Setup Required</Text>
                  <Text style={styles.customerIncompleteText}>
                    You must complete your profile details (Email and Residential Address) in the Profile tab to choose or enroll in a scheme.
                  </Text>
                </View>
                <Text style={styles.customerIncompleteAction}>Setup →</Text>
              </TouchableOpacity>
            )}

            {schemes.map((s) => {
              const isCurrent = hasAvailedScheme && (s.id === customer.schemeId);
              const interest = s.interestAmount || 0;
              const interestRate = ((interest / s.totalAmount) * 100).toFixed(1);
              const payout = s.payoutAmount || Math.max(0, s.totalAmount - interest);

              return (
                <Card key={s.id} style={[styles.availableSchemeCard, isCurrent && styles.activeSchemeCardBorder]}>
                  <View style={styles.schemeCardHeader}>
                    <View style={{ flex: 1, marginRight: SPACING.sm }}>
                      <Text style={styles.schemeCardName}>{s.name}</Text>
                      <Text style={styles.schemeCardTag}>
                        ₹{s.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(s.frequency)} ({s.durationWeeksOrMonths} collections)
                      </Text>
                    </View>

                    {isCurrent ? (
                      <View style={styles.enrolledBadge}>
                        <Text style={styles.enrolledBadgeText}>✓ Active Scheme</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.selectSchemeBtn,
                          !isCustProfileComplete && styles.selectSchemeBtnDisabled,
                        ]}
                        onPress={() => handleSelectScheme(s)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.selectSchemeBtnText}>
                          {isCustProfileComplete ? 'Avail Scheme →' : 'Complete Profile'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.schemeCardDivider} />

                  <View style={styles.schemeCardGrid}>
                    <View style={styles.schemeCardCol}>
                      <Text style={styles.schemeCardLabel}>TOTAL VALUE</Text>
                      <Text style={styles.schemeCardVal}>₹{s.totalAmount.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.schemeCardCol}>
                      <Text style={styles.schemeCardLabel}>INTEREST DEDUCTION</Text>
                      <Text style={styles.schemeCardInterest}>- ₹{interest.toLocaleString('en-IN')} ({interestRate}%)</Text>
                    </View>
                    <View style={styles.schemeCardCol}>
                      <Text style={styles.schemeCardLabel}>NET PAYOUT</Text>
                      <Text style={styles.schemeCardPayout}>₹{payout.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>

                  {s.description ? (
                    <Text style={styles.schemeCardDesc}>{s.description}</Text>
                  ) : null}
                </Card>
              );
            })}
          </>
        )}

        {/* Recent Payments Collected */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Payments Collected</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Receipts')}>
            <Text style={styles.sectionLink}>View All Receipts</Text>
          </TouchableOpacity>
        </View>
        <Card style={styles.historyCard}>
          {recentPayments.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No payments recorded by admin yet.</Text>
            </View>
          ) : (
            recentPayments.map((item) => (
              <TransactionRow
                key={item.id}
                amount={item.amount}
                date={item.date}
                method={item.method}
                onPressReceipt={() => navigation.navigate('ReceiptDetail', { receiptId: item.receiptId })}
              />
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  welcomeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    letterSpacing: 1,
  },
  customerName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.white,
    fontWeight: '700',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerLogoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  headerLogoutText: {
    ...TYPOGRAPHY.captionBold,
    color: '#FCA5A5',
    fontSize: 12,
  },
  scrollContent: {
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },
  heroCard: {
    backgroundColor: COLORS.primaryLight,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  heroLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    letterSpacing: 1,
  },
  heroAmount: {
    ...TYPOGRAPHY.amountLarge,
    color: COLORS.white,
    marginTop: SPACING.sm,
  },
  heroSubText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginTop: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: SPACING.md,
  },
  progressBarFg: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subStatLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
  },
  subStatValue: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
    marginTop: 2,
  },
  nextPayCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  upToDateNextPayCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#6EE7B7',
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  upToDateHeaderBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  upToDateHeaderBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#065F46',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  upToDateNextPayLabel: {
    ...TYPOGRAPHY.captionBold,
    color: '#047857',
    letterSpacing: 0.5,
  },
  upToDateNextPayDate: {
    ...TYPOGRAPHY.h2,
    color: '#065F46',
    marginTop: SPACING.xs,
  },
  upToDateNextPayDetails: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#047857',
    marginTop: 2,
    marginBottom: SPACING.md,
    fontWeight: '600',
  },
  upToDateAdminCollectionBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  upToDateAdminCollectionText: {
    ...TYPOGRAPHY.captionBold,
    color: '#047857',
    fontSize: 11,
  },
  overdueNextPayCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderLeftWidth: 6,
  },
  overdueHeaderBadge: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  overdueHeaderBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#DC2626',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  nextPayLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  overdueNextPayLabel: {
    color: '#B91C1C',
  },
  nextPayDate: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  overdueNextPayDate: {
    color: '#991B1B',
  },
  nextPayDetails: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  overdueNextPayDetails: {
    color: '#DC2626',
    fontWeight: '600',
  },
  overdueWarningBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: SPACING.sm + 2,
    width: '100%',
    alignItems: 'center',
  },
  overdueWarningTitle: {
    ...TYPOGRAPHY.captionBold,
    color: '#991B1B',
    fontSize: 11,
    marginBottom: 2,
  },
  overdueWarningText: {
    ...TYPOGRAPHY.caption,
    color: '#B91C1C',
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 15,
  },
  adminCollectionBadge: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  adminCollectionText: {
    ...TYPOGRAPHY.captionBold,
    color: '#0369A1',
    fontSize: 11,
  },
  settledCard: {
    backgroundColor: COLORS.successLight,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingVertical: SPACING.lg,
  },
  settledTextTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.success,
  },
  settledTextDesc: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.success,
    textAlign: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  sectionHeaderBox: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: -SPACING.xs + 2,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  sectionLink: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.secondary,
  },
  lockedTermsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.sm + 2,
  },
  lockedTermsIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  lockedTermsTitle: {
    ...TYPOGRAPHY.captionBold,
    color: '#0F172A',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  lockedTermsSub: {
    ...TYPOGRAPHY.caption,
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },
  schemeCard: {
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  schemeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  schemeInterestVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#D97706',
  },
  schemeHighlightRow: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
    marginVertical: 4,
    borderBottomWidth: 0,
  },
  schemeHighlightLabel: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#047857',
    fontSize: 13,
  },
  schemeHighlightVal: {
    ...TYPOGRAPHY.amountMedium,
    color: '#059669',
    fontSize: 15,
  },
  customerNoticeBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    padding: SPACING.sm + 2,
    marginTop: SPACING.md,
    alignItems: 'flex-start',
  },
  noticeIcon: {
    fontSize: 14,
    marginRight: 6,
    marginTop: 1,
  },
  noticeText: {
    ...TYPOGRAPHY.caption,
    color: '#0369A1',
    flex: 1,
    lineHeight: 16,
    fontSize: 11,
  },
  schemeLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
  },
  schemeVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
  },
  availableSchemeCard: {
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  activeSchemeCardBorder: {
    borderColor: COLORS.success,
    backgroundColor: '#F0FDF4',
  },
  schemeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  schemeCardName: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.primary,
  },
  schemeCardTag: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  enrolledBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 16,
  },
  enrolledBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#065F46',
    fontSize: 11,
  },
  selectSchemeBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectSchemeBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 11,
  },
  schemeCardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm + 2,
  },
  schemeCardGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  schemeCardCol: {
    flex: 1,
  },
  schemeCardLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    fontSize: 9,
  },
  schemeCardVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
    marginTop: 2,
  },
  schemeCardInterest: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#D97706',
    marginTop: 2,
  },
  schemeCardPayout: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.success,
    marginTop: 2,
  },
  schemeCardDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    fontSize: 11,
    lineHeight: 15,
  },
  historyCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 0,
    marginBottom: SPACING.xl,
  },
  emptyHistory: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  emptyHistoryText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
  },
  lockedCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  lockedIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  lockedIcon: {
    fontSize: 28,
  },
  lockedTitle: {
    ...TYPOGRAPHY.h3,
    color: '#334155',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  lockedText: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  lockedBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  lockedBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#92400E',
  },
  customerIncompleteBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerIncompleteIcon: {
    fontSize: 22,
  },
  customerIncompleteTitle: {
    ...TYPOGRAPHY.captionBold,
    color: '#92400E',
    fontSize: 12,
  },
  customerIncompleteText: {
    ...TYPOGRAPHY.caption,
    color: '#B45309',
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
  },
  customerIncompleteAction: {
    ...TYPOGRAPHY.captionBold,
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: SPACING.xs,
  },
  selectSchemeBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  errorText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.danger,
    marginBottom: SPACING.lg,
  },
  // Latest Invoice Proof Card Styles
  latestInvoiceCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#34D399',
    borderRadius: 14,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
  },
  latestInvoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs + 2,
  },
  latestInvoiceBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  latestInvoiceBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#065F46',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  latestInvoiceDate: {
    ...TYPOGRAPHY.caption,
    color: '#047857',
    fontSize: 11,
  },
  latestInvoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  latestInvoiceInfo: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  latestInvoiceAmount: {
    ...TYPOGRAPHY.amountMedium,
    color: '#065F46',
    fontWeight: '800',
  },
  latestInvoiceSub: {
    ...TYPOGRAPHY.caption,
    color: '#047857',
    marginTop: 1,
  },
  latestInvoiceBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  latestInvoiceBtnIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  latestInvoiceBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 11,
  },
  // No Scheme Hero Card
  noSchemeHeroCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#7DD3FC',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  noSchemeHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  noSchemeHeroBadge: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  noSchemeHeroBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#0284C7',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  noSchemeHeroStep: {
    ...TYPOGRAPHY.captionBold,
    color: '#0369A1',
    fontSize: 11,
  },
  noSchemeHeroTitle: {
    ...TYPOGRAPHY.h3,
    color: '#0C4A6E',
    marginBottom: 4,
  },
  noSchemeHeroDesc: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#0369A1',
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  noSchemeHeroBtn: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSchemeHeroBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
  },
  // Empty Scheme Card (Under My Chit Scheme & Payout Details)
  emptySchemeCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emptySchemeIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  emptySchemeIcon: {
    fontSize: 26,
  },
  emptySchemeTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: 4,
  },
  emptySchemeText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 380,
  },
});

export default HomeScreen;
