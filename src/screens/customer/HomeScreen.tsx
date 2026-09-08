import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import TransactionRow from '../../components/TransactionRow';
import { formatDateLong, formatDateShort, getPaymentStatusInfo, formatFrequency } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    selectedCustomerId,
    customers,
    payments,
    receipts,
    getCustomerStats,
    getSchemeStats,
    logout,
  } = useChitData();

  const customer = customers.find((c) => c.id === selectedCustomerId);

  if (!customer) {
    return (
      <SafeAreaView style={styles.errorContainer} edges={['top', 'bottom']}>
        <View style={styles.completedNoticeBox}>
          <Text style={styles.completedNoticeIcon}>🎉</Text>
          <Text style={styles.completedNoticeTitle}>All Installment Payments Completed!</Text>
          <Text style={styles.completedNoticeDesc}>
            All installment payments for your chit scheme have been completed and your profile has been successfully closed.
          </Text>
          <Text style={styles.completedNoticeSub}>
            Thank you for being a valued member!
          </Text>
          <Button
            title="Log Out"
            onPress={() => logout()}
            variant="primary"
            style={{ marginTop: SPACING.lg, minWidth: 160 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const totalValue = customer.totalAmount || customer.amountGiven || 0;
  const interestAmt = customer.interestAmount ?? Math.max(0, totalValue - (customer.payoutAmount || 0));
  const payoutAmt = customer.payoutAmount ?? Math.max(0, totalValue - interestAmt);

  const stats = getCustomerStats(customer.id);
  const customerPayments = payments.filter((p) => p.customerId === customer.id);
  const recentPayments = customerPayments.slice(0, 3);
  const latestPayment = customerPayments.length > 0 ? customerPayments[0] : null;
  const latestReceipt = latestPayment
    ? receipts.find((r) => r.paymentId === latestPayment.id || r.id === latestPayment.receiptId)
    : null;

  const statusInfo = getPaymentStatusInfo(customer.nextPaymentDate, stats.remainingAmount, customer.frequency);
  const isOverdue = statusInfo.isOverdue && stats.remainingAmount > 0;
  const isDueToday = statusInfo.status === 'DUE_TODAY' && stats.remainingAmount > 0;
  const isSettled = stats.remainingAmount === 0 && totalValue > 0;
  const [showCompletionModal, setShowCompletionModal] = useState(isSettled);
  const enrolledSchemes = Array.isArray(customer.enrolledSchemes) ? customer.enrolledSchemes : [];
  const hasMultipleSchemes = enrolledSchemes.length > 1;

  const nameInitials = customer.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: SPACING.sm }}>
          <Text style={styles.welcomeText}>MEMBER PORTAL</Text>
          <View style={styles.headerNameRow}>
            <Text style={styles.customerName} numberOfLines={1}>{customer.name}</Text>
            <View style={styles.custIdBadge}>
              <Text style={styles.custIdBadgeText}>{customer.id}</Text>
            </View>
          </View>
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
            onPress={() => logout()}
            activeOpacity={0.8}
          >
            <Text style={styles.headerLogoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* LATEST PAYMENT CREDITED BANNER */}
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
                <Text style={styles.latestInvoiceBtnText}>Invoice</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* DUE DATE REMINDER CARDS */}
        {isOverdue ? (
          <Card style={styles.overdueDueCard}>
            <View style={styles.overdueBadgeRow}>
              <View style={styles.overdueHeaderBadge}>
                <Text style={styles.overdueHeaderBadgeText}>⚠️ INSTALLMENT OVERDUE</Text>
              </View>
              <Text style={styles.overdueDaysNotice}>{statusInfo.statusText}</Text>
            </View>

            <Text style={styles.dueAmountHeader}>
              ₹{customer.collectionAmount.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.dueDateOverdueText}>
              Was due on {formatDateLong(customer.nextPaymentDate)}
            </Text>

            <View style={styles.overdueWarningBox}>
              <Text style={styles.overdueWarningTitle}>PAYMENT NOTICE</Text>
              <Text style={styles.overdueWarningDesc}>
                Your scheduled installment is overdue. Please settle this amount with your administrator or field collector to keep your ledger in good standing.
              </Text>
            </View>
          </Card>
        ) : isDueToday ? (
          <Card style={styles.dueTodayCard}>
            <View style={styles.dueTodayBadge}>
              <Text style={styles.dueTodayBadgeText}>📅 DUE TODAY</Text>
            </View>
            <Text style={styles.dueAmountHeader}>
              ₹{customer.collectionAmount.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.dueDateTodayText}>
              Due Today ({formatDateLong(customer.nextPaymentDate)})
            </Text>
            <Text style={styles.dueTodayNote}>
              Kindly make your installment payment to the administrator today.
            </Text>
          </Card>
        ) : isSettled ? (
          <Card style={styles.settledCard}>
            <Text style={styles.settledIcon}>🎉</Text>
            <Text style={styles.settledTitle}>Account Fully Settled!</Text>
            <Text style={styles.settledDesc}>
              You have completed all repayment installments for this loan. Thank you!
            </Text>
          </Card>
        ) : (
          <Card style={styles.upToDateCard}>
            <View style={styles.upToDateBadge}>
              <Text style={styles.upToDateBadgeText}>✓ UP TO DATE</Text>
            </View>
            <Text style={styles.upToDateNextPayLabel}>NEXT COLLECTION DUE</Text>
            <Text style={styles.upToDateNextPayDate}>{formatDateLong(customer.nextPaymentDate)}</Text>
            <Text style={styles.upToDateNextPayDetails}>
              ₹{customer.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(customer.frequency)}
            </Text>
            <Text style={styles.upToDateAdminNote}>
              📌 Installments are collected & verified directly by Admin
            </Text>
          </Card>
        )}

        {/* MULTI-SCHEME BREAKDOWN CARDS (IF MULTIPLE SCHEMES) */}
        {hasMultipleSchemes && (
          <View style={styles.schemesSection}>
            <View style={styles.schemesHeaderRow}>
              <Text style={styles.sectionTitle}>
                Active Schemes ({enrolledSchemes.length})
              </Text>
              <View style={styles.schemesCountBadge}>
                <Text style={styles.schemesCountBadgeText}>MULTIPLE LOANS</Text>
              </View>
            </View>

            {enrolledSchemes.map((schemeItem: any, idx: number) => {
              const p = Number(schemeItem.payoutAmount || 0);
              const i = Number(schemeItem.interestAmount || 0);
              const t = Number(schemeItem.totalAmount || (p + i) || 0);
              const c = Number(schemeItem.collectionAmount || 0);
              const dur = Number(schemeItem.durationInstallments || 50);
              const f = schemeItem.frequency || customer.frequency || 'daily';
              const name = schemeItem.loanName || `Scheme #${idx + 1}`;
              const sDate = schemeItem.startDate ? formatDateShort(schemeItem.startDate) : 'Active';

              const schemeStats = getSchemeStats(customer.id, schemeItem.id || name);
              const isSchemeSettled = schemeStats.remainingAmount === 0 && t > 0;

              return (
                <Card key={schemeItem.id || idx} style={styles.schemeItemCard}>
                  <View style={styles.schemeItemHeader}>
                    <View style={styles.schemeBadgeRow}>
                      <View style={styles.schemeBadge}>
                        <Text style={styles.schemeBadgeText}>{name}</Text>
                      </View>
                      {isSchemeSettled && (
                        <View style={styles.schemeSettledBadge}>
                          <Text style={styles.schemeSettledBadgeText}>✓ Settled</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.schemeDateText}>Disbursed: {sDate}</Text>
                  </View>

                  <View style={styles.schemeGrid}>
                    <View style={styles.schemeGridCol}>
                      <Text style={styles.schemeGridLabel}>DISBURSED PAYOUT</Text>
                      <Text style={styles.schemeGridPayoutVal}>₹{p.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.schemeGridCol}>
                      <Text style={styles.schemeGridLabel}>INTEREST</Text>
                      <Text style={styles.schemeGridInterestVal}>₹{i.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.schemeGridCol}>
                      <Text style={styles.schemeGridLabel}>TOTAL REPAYABLE</Text>
                      <Text style={styles.schemeGridRepayVal}>₹{t.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.schemeGridCol}>
                      <Text style={styles.schemeGridLabel}>PAID SO FAR</Text>
                      <Text style={styles.schemeGridPaidVal}>₹{schemeStats.paidAmount.toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={styles.schemeGridCol}>
                      <Text style={styles.schemeGridLabel}>REMAINING</Text>
                      <Text style={styles.schemeGridRemVal}>₹{schemeStats.remainingAmount.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>

                  {/* Scheme Mini Progress Bar */}
                  <View style={styles.schemeProgressContainer}>
                    <View style={styles.schemeProgressTrack}>
                      <View style={[styles.schemeProgressBar, { width: `${schemeStats.progressPercentage}%` }]} />
                    </View>
                    <Text style={styles.schemeProgressPercentageText}>
                      {Math.round(schemeStats.progressPercentage)}% Paid
                    </Text>
                  </View>

                  <View style={styles.schemeFooter}>
                    <Text style={styles.schemeFooterText}>
                      Installment: <Text style={{ fontWeight: '700', color: COLORS.secondary }}>₹{c.toLocaleString('en-IN')}</Text> / {formatFrequency(f)} ({dur} cycles)
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        {/* LENDING & REPAYMENT TERMS CARD */}
        <Text style={styles.sectionTitle}>
          {hasMultipleSchemes ? 'Combined Lending Terms & Collection' : 'Lending & Repayment Terms'}
        </Text>
        <Card style={styles.termsCard}>
          <View style={styles.termsIdRow}>
            <Text style={styles.termsIdLabel}>Customer ID (Login ID)</Text>
            <Text style={styles.termsIdVal}>{customer.id}</Text>
          </View>

          <View style={styles.termsGrid}>
            <View style={styles.termsCol}>
              <Text style={styles.termsLabel}>DISBURSED PAYOUT</Text>
              <Text style={styles.termsPayoutVal}>₹{payoutAmt.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.termsCol}>
              <Text style={styles.termsLabel}>TOTAL REPAYABLE</Text>
              <Text style={styles.termsVal}>₹{totalValue.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.termsCol}>
              <Text style={styles.termsLabel}>PAID SO FAR</Text>
              <Text style={styles.termsPaidVal}>₹{stats.paidAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.termsCol}>
              <Text style={styles.termsLabel}>REMAINING</Text>
              <Text style={styles.termsRemVal}>₹{stats.remainingAmount.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${stats.progressPercentage}%` }]} />
            </View>
            <Text style={styles.progressPercentageText}>{Math.round(stats.progressPercentage)}% Paid</Text>
          </View>

          <View style={styles.termsDivider} />

          <View style={styles.termsRow}>
            <Text style={styles.termsRowLabel}>Collection Schedule</Text>
            <Text style={styles.termsRowVal}>
              ₹{customer.collectionAmount.toLocaleString('en-IN')} / {formatFrequency(customer.frequency)}
            </Text>
          </View>

          <View style={styles.termsRow}>
            <Text style={styles.termsRowLabel}>Total Installment Cycles</Text>
            <Text style={styles.termsRowVal}>
              {customer.durationInstallments || 50} installments
            </Text>
          </View>

          <View style={styles.termsRow}>
            <Text style={styles.termsRowLabel}>Total Collections Recorded</Text>
            <Text style={styles.termsRowVal}>
              {stats.totalPayments} {stats.totalPayments === 1 ? 'payment' : 'payments'}
            </Text>
          </View>
        </Card>

        {/* RECENT PAYMENTS */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Payments')}>
            <Text style={styles.viewAllLink}>View All →</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.historyCard}>
          {recentPayments.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No payments recorded yet</Text>
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

      {/* All Installments Completed Modal for Customer */}
      <Modal
        visible={showCompletionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowCompletionModal(false);
          logout();
        }}
      >
        <View style={styles.completedModalOverlay}>
          <View style={styles.completedModalBox}>
            <Text style={styles.completedModalIcon}>🎉</Text>
            <Text style={styles.completedModalTitle}>All Installment Payments Completed!</Text>
            <Text style={styles.completedModalDesc}>
              All installment payments for your chit scheme have been completed and your account has been successfully closed.
            </Text>
            <Text style={styles.completedModalSub}>
              Thank you for being a valued member! Your profile will now be logged out.
            </Text>
            <TouchableOpacity
              style={styles.completedModalBtn}
              onPress={() => {
                setShowCompletionModal(false);
                logout();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.completedModalBtnText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  welcomeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    letterSpacing: 1,
    fontSize: 10,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  customerName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
  },
  custIdBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  custIdBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
    fontSize: 13,
  },
  headerLogoutBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 7,
    borderRadius: 8,
  },
  headerLogoutText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 11,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexGrow: 1,
  },
  latestInvoiceCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1,
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  latestInvoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  latestInvoiceBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  latestInvoiceBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#15803D',
    fontSize: 10,
  },
  latestInvoiceDate: {
    ...TYPOGRAPHY.caption,
    color: '#166534',
  },
  latestInvoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  latestInvoiceInfo: {
    flex: 1,
  },
  latestInvoiceAmount: {
    ...TYPOGRAPHY.h2,
    color: '#15803D',
  },
  latestInvoiceSub: {
    ...TYPOGRAPHY.caption,
    color: '#166534',
  },
  latestInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  latestInvoiceBtnIcon: {
    fontSize: 12,
  },
  latestInvoiceBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 11,
  },
  // Due date cards
  overdueDueCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  overdueBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  overdueHeaderBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  overdueHeaderBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#DC2626',
    fontSize: 10,
  },
  overdueDaysNotice: {
    ...TYPOGRAPHY.captionBold,
    color: '#DC2626',
  },
  dueAmountHeader: {
    ...TYPOGRAPHY.hero,
    color: '#DC2626',
    marginVertical: SPACING.xs,
  },
  dueDateOverdueText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#991B1B',
  },
  overdueWarningBox: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  overdueWarningTitle: {
    ...TYPOGRAPHY.captionBold,
    color: '#DC2626',
    fontSize: 10,
    marginBottom: 2,
  },
  overdueWarningDesc: {
    ...TYPOGRAPHY.caption,
    color: '#7F1D1D',
    lineHeight: 15,
  },
  dueTodayCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  dueTodayBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: SPACING.xs,
  },
  dueTodayBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#D97706',
    fontSize: 10,
  },
  dueDateTodayText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#92400E',
  },
  dueTodayNote: {
    ...TYPOGRAPHY.caption,
    color: '#B45309',
    marginTop: SPACING.xs,
  },
  settledCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  settledIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  settledTitle: {
    ...TYPOGRAPHY.h3,
    color: '#15803D',
  },
  settledDesc: {
    ...TYPOGRAPHY.caption,
    color: '#166534',
    textAlign: 'center',
    marginTop: 4,
  },
  upToDateCard: {
    backgroundColor: COLORS.white,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
  },
  upToDateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: SPACING.xs,
  },
  upToDateBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#15803D',
    fontSize: 10,
  },
  upToDateNextPayLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  upToDateNextPayDate: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    marginVertical: 2,
  },
  upToDateNextPayDetails: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.secondary,
  },
  upToDateAdminNote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: SPACING.xs + 2,
  },
  termsCard: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
  },
  termsIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  termsIdLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
  },
  termsIdVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.secondary,
    fontFamily: 'monospace',
  },
  termsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  termsCol: {
    alignItems: 'flex-start',
  },
  termsLabel: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 9,
    color: COLORS.textLight,
  },
  termsVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
    fontSize: 12,
  },
  termsPayoutVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#2563EB',
    fontSize: 12,
  },
  termsPaidVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.success,
    fontSize: 12,
  },
  termsRemVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.danger,
    fontSize: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.success,
  },
  progressPercentageText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10,
    color: COLORS.textMuted,
    minWidth: 50,
    textAlign: 'right',
  },
  termsDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  termsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  termsRowLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    fontSize: 13,
  },
  termsRowVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
    fontSize: 13,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs + 2,
  },
  viewAllLink: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
  },
  historyCard: {
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
  // Multi-Scheme Styles
  schemesSection: {
    marginBottom: SPACING.md,
  },
  schemesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  schemesCountBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  schemesCountBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#2563EB',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  schemeItemCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.sm + 2,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  schemeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  schemeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  schemeBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  schemeBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#1E40AF',
    fontSize: 10,
  },
  schemeSettledBadge: {
    backgroundColor: '#DEF7EC',
    borderColor: '#31C48D',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  schemeSettledBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#03543F',
    fontSize: 9,
  },
  schemeDateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 10,
  },
  schemeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: SPACING.xs + 4,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  schemeGridCol: {
    alignItems: 'center',
    flex: 1,
    minWidth: 65,
  },
  schemeGridLabel: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 8,
    color: COLORS.textMuted,
    marginBottom: 2,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  schemeGridPayoutVal: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 12,
    color: '#2563EB',
  },
  schemeGridInterestVal: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 12,
    color: '#D97706',
  },
  schemeGridRepayVal: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 12,
    color: COLORS.primary,
  },
  schemeGridPaidVal: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 12,
    color: COLORS.success,
  },
  schemeGridRemVal: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '700',
  },
  schemeProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  schemeProgressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  schemeProgressBar: {
    height: '100%',
    backgroundColor: COLORS.success,
  },
  schemeProgressPercentageText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 9,
    color: COLORS.textMuted,
    minWidth: 46,
    textAlign: 'right',
  },
  schemeFooter: {
    marginTop: 2,
  },
  schemeFooterText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    fontSize: 11,
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
  completedNoticeBox: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    borderRadius: 16,
    alignItems: 'center',
    maxWidth: 400,
    width: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  completedNoticeIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  completedNoticeTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  completedNoticeDesc: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xs,
  },
  completedNoticeSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  completedModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  completedModalBox: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.xl,
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  completedModalIcon: {
    fontSize: 52,
    marginBottom: SPACING.md,
  },
  completedModalTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  completedModalDesc: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.sm,
  },
  completedModalSub: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  completedModalBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + 4,
    borderRadius: 10,
    minWidth: 160,
    alignItems: 'center',
  },
  completedModalBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
  },
});

export default HomeScreen;
