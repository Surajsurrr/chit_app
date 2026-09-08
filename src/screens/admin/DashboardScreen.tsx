import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Card from '../../components/Card';
import { formatDateShort, getPaymentStatusInfo, formatFrequency } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { getAdminStats, customers, payments, resetData, logout, getCustomerStats, isAdminProfileComplete } = useChitData();
  const stats = getAdminStats();

  // Categorize customers by due date status
  const customerDueStatus = customers.map((c) => {
    const custStats = getCustomerStats(c.id);
    const info = getPaymentStatusInfo(c.nextPaymentDate, custStats.remainingAmount, c.frequency);
    return {
      customer: c,
      stats: custStats,
      info,
    };
  });

  const overdueList = customerDueStatus.filter((item) => item.info.isOverdue && item.stats.remainingAmount > 0);
  const dueTodayList = customerDueStatus.filter((item) => item.info.status === 'DUE_TODAY' && item.stats.remainingAmount > 0);
  const upcomingList = customerDueStatus.filter((item) => item.info.status === 'UPCOMING' && item.stats.remainingAmount > 0);

  const totalOverdueDues = overdueList.reduce((sum, item) => sum + item.customer.collectionAmount, 0);
  const totalDisbursed = customers.reduce((sum, c) => sum + (c.payoutAmount || c.amountGiven || 0), 0);
  const recentCollections = payments.slice(0, 5);

  const handleSendReminder = (cust: typeof customers[0], info: any, remAmount: number) => {
    let msg = '';
    if (info.isOverdue) {
      msg = `Dear ${cust.name} (ID: ${cust.id}), this is an urgent reminder from ChitFlow. Your installment of ₹${cust.collectionAmount.toLocaleString('en-IN')} is OVERDUE (${info.statusText}). Remaining balance: ₹${remAmount.toLocaleString('en-IN')}. Please settle your payment immediately. Thank you!`;
    } else if (info.status === 'DUE_TODAY') {
      msg = `Dear ${cust.name} (ID: ${cust.id}), this is a reminder from ChitFlow. Your installment of ₹${cust.collectionAmount.toLocaleString('en-IN')} is due TODAY. Remaining balance: ₹${remAmount.toLocaleString('en-IN')}. Thank you!`;
    } else {
      msg = `Dear ${cust.name} (ID: ${cust.id}), this is a notification from ChitFlow. Your upcoming installment of ₹${cust.collectionAmount.toLocaleString('en-IN')} is due on ${info.formattedDueDate}. Thank you!`;
    }

    const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open WhatsApp.'));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>ChitFlow Admin</Text>
          <Text style={styles.headerSubtitle}>Lending & Collection Operations</Text>
        </View>
        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => navigation.navigate('AdminProfile')}
            activeOpacity={0.85}
          >
            <Text style={styles.profileBtnText}>👤 Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.roleBtn} onPress={() => logout()} activeOpacity={0.8}>
            <Text style={styles.roleBtnText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Admin Profile Setup Incomplete Warning */}
        {!isAdminProfileComplete && (
          <TouchableOpacity
            style={styles.profileWarningBanner}
            onPress={() => navigation.navigate('AdminProfile')}
            activeOpacity={0.9}
          >
            <View style={styles.profileWarningIconBox}>
              <Text style={styles.profileWarningIcon}>⚠️</Text>
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={styles.profileWarningTitle}>Organizer Profile Incomplete</Text>
              <Text style={styles.profileWarningSub}>
                Set up your organizer contact details (Name, Phone, Address) to personalize member receipts and messages.
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* FINANCIAL SUMMARY KPIS */}
        <View style={styles.grid}>
          <View style={styles.gridCol}>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>CUSTOMERS</Text>
              <Text style={styles.statValue}>{customers.length}</Text>
            </Card>
          </View>
          <View style={styles.gridCol}>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>TOTAL DISBURSED</Text>
              <Text style={styles.statValue}>₹{totalDisbursed.toLocaleString('en-IN')}</Text>
            </Card>
          </View>
          <View style={styles.gridCol}>
            <Card style={[styles.statCard, styles.collectedCard]}>
              <Text style={[styles.statLabel, styles.collectedLabel]}>COLLECTED</Text>
              <Text style={[styles.statValue, styles.collectedValue]}>₹{stats.totalCollected.toLocaleString('en-IN')}</Text>
            </Card>
          </View>
          <View style={styles.gridCol}>
            <Card style={[styles.statCard, styles.outstandingCard]}>
              <Text style={[styles.statLabel, styles.outstandingLabel]}>OUTSTANDING</Text>
              <Text style={[styles.statValue, styles.outstandingValue]}>₹{stats.outstandingAmount.toLocaleString('en-IN')}</Text>
            </Card>
          </View>
        </View>

        {/* Collection Progress Card */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Overall Repayment Progress</Text>
            <Text style={styles.progressPercent}>{stats.collectionProgress.toFixed(1)}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFg, { width: `${stats.collectionProgress}%` }]} />
          </View>
          <Text style={styles.progressDesc}>
            ₹{stats.totalCollected.toLocaleString('en-IN')} collected out of ₹{stats.totalGiven.toLocaleString('en-IN')} total repayment obligation
          </Text>
        </Card>

        {/* DUE DATE REMINDERS & COLLECTION ALERTS SECTION */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>🔔 Due Date Reminders & Alerts</Text>
            <Text style={styles.sectionSubtitleText}>
              Actionable repayment schedules and overdue follow-ups
            </Text>
          </View>
        </View>

        {/* Overdue Alert Card */}
        {overdueList.length > 0 ? (
          <Card style={styles.overdueSectionCard}>
            <View style={styles.overdueHeaderRow}>
              <View style={styles.overdueBadgeBox}>
                <Text style={styles.overdueBadgeIcon}>⚠️</Text>
                <Text style={styles.overdueBadgeText}>
                  {overdueList.length} OVERDUE {overdueList.length === 1 ? 'INSTALLMENT' : 'INSTALLMENTS'}
                </Text>
              </View>
              <Text style={styles.overdueTotalAmount}>
                ₹{totalOverdueDues.toLocaleString('en-IN')} pending
              </Text>
            </View>

            {overdueList.map(({ customer: c, stats: custStats, info }) => (
              <View key={c.id} style={styles.dueItemRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.custNameBadgeRow}>
                    <Text style={styles.dueCustName}>{c.name}</Text>
                    <View style={styles.custIdPill}>
                      <Text style={styles.custIdPillText}>{c.id}</Text>
                    </View>
                  </View>
                  <Text style={styles.overdueDaysText}>
                    Due on {formatDateShort(c.nextPaymentDate)} · {info.statusText}
                  </Text>
                  <Text style={styles.dueAmountSub}>
                    Installment: ₹{c.collectionAmount.toLocaleString('en-IN')} (Remaining: ₹{custStats.remainingAmount.toLocaleString('en-IN')})
                  </Text>
                </View>

                <View style={styles.dueActionRow}>
                  <TouchableOpacity
                    style={styles.dueCollectBtn}
                    onPress={() => navigation.navigate('Collections', { customerId: c.id })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dueCollectBtnText}>Collect</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dueWaBtn}
                    onPress={() => handleSendReminder(c, info, custStats.remainingAmount)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dueWaBtnText}>💬 WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        {/* Due Today Card */}
        {dueTodayList.length > 0 ? (
          <Card style={styles.dueTodaySectionCard}>
            <View style={styles.dueTodayHeaderRow}>
              <Text style={styles.dueTodayTitle}>📅 Due Today ({dueTodayList.length})</Text>
            </View>
            {dueTodayList.map(({ customer: c, stats: custStats, info }) => (
              <View key={c.id} style={styles.dueItemRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.custNameBadgeRow}>
                    <Text style={styles.dueCustName}>{c.name}</Text>
                    <View style={styles.custIdPill}>
                      <Text style={styles.custIdPillText}>{c.id}</Text>
                    </View>
                  </View>
                  <Text style={styles.dueAmountSub}>
                    Due: ₹{c.collectionAmount.toLocaleString('en-IN')} / {formatFrequency(c.frequency)}
                  </Text>
                </View>
                <View style={styles.dueActionRow}>
                  <TouchableOpacity
                    style={styles.dueCollectBtn}
                    onPress={() => navigation.navigate('Collections', { customerId: c.id })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dueCollectBtnText}>Collect</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dueWaBtn}
                    onPress={() => handleSendReminder(c, info, custStats.remainingAmount)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dueWaBtnText}>💬 Remind</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        {/* Upcoming Collections in next few days */}
        {upcomingList.length > 0 && overdueList.length === 0 && dueTodayList.length === 0 ? (
          <Card style={styles.upcomingCard}>
            <Text style={styles.upcomingTitle}>🗓️ Upcoming Collections</Text>
            {upcomingList.slice(0, 3).map(({ customer: c, info }) => (
              <View key={c.id} style={styles.upcomingItemRow}>
                <View style={styles.custNameBadgeRow}>
                  <Text style={styles.upcomingCustName}>{c.name}</Text>
                  <View style={styles.custIdPill}>
                    <Text style={styles.custIdPillText}>{c.id}</Text>
                  </View>
                </View>
                <Text style={styles.upcomingDateText}>
                  ₹{c.collectionAmount.toLocaleString('en-IN')} on {info.formattedDueDate}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        {/* All up-to-date banner when no overdue or dues today */}
        {overdueList.length === 0 && dueTodayList.length === 0 && (
          <Card style={styles.allClearCard}>
            <Text style={styles.allClearIcon}>✓</Text>
            <Text style={styles.allClearTitle}>All Collections Up To Date!</Text>
            <Text style={styles.allClearSub}>
              No overdue payments today. All customer accounts are healthy.
            </Text>
          </Card>
        )}

        {/* CUSTOMER LEDGER ROSTER */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Customer Lending Roster</Text>
            <Text style={styles.sectionSubtitleText}>
              Individual lending terms, disbursed payouts & balances
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Customers')}>
            <Text style={styles.sectionLink}>View All ({customers.length}) →</Text>
          </TouchableOpacity>
        </View>

        {customers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Customers Added Yet</Text>
            <Text style={styles.emptyText}>
              Click "+ Add Customer" in the top bar or Customers tab to create your first lending record.
            </Text>
          </Card>
        ) : (
          customers.slice(0, 5).map((c) => {
            const custStats = getCustomerStats(c.id);
            const totalVal = c.totalAmount || c.amountGiven || 0;
            const payout = c.payoutAmount ?? Math.max(0, totalVal - (c.interestAmount || 0));
            const status = getPaymentStatusInfo(c.nextPaymentDate, custStats.remainingAmount, c.frequency);

            return (
              <Card key={c.id} style={styles.custRosterCard} padding={SPACING.md}>
                <View style={styles.custRosterHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.custNameBadgeRow}>
                      <Text style={styles.custRosterName}>{c.name}</Text>
                      <View style={styles.custIdPill}>
                        <Text style={styles.custIdPillText}>{c.id}</Text>
                      </View>
                      <View style={[styles.statusBadge, status.isOverdue && styles.statusBadgeOverdue]}>
                        <Text style={[styles.statusBadgeText, status.isOverdue && styles.statusBadgeTextOverdue]}>
                          {status.isOverdue ? 'Overdue' : 'Active'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.custRosterPhone}>📞 +91 {c.phone}</Text>
                  </View>
                </View>

                <View style={styles.custRosterDivider} />

                <View style={styles.custRosterGrid}>
                  <View style={styles.custGridCol}>
                    <Text style={styles.custGridLabel}>DISBURSED</Text>
                    <Text style={styles.custGridVal}>₹{payout.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.custGridCol}>
                    <Text style={styles.custGridLabel}>TOTAL REPAY</Text>
                    <Text style={styles.custGridVal}>₹{totalVal.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.custGridCol}>
                    <Text style={styles.custGridLabel}>PAID</Text>
                    <Text style={styles.custGridValPaid}>₹{custStats.paidAmount.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.custGridCol}>
                    <Text style={styles.custGridLabel}>REMAINING</Text>
                    <Text style={styles.custGridValRem}>₹{custStats.remainingAmount.toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                {/* Repayment Progress */}
                <View style={styles.rosterProgressRow}>
                  <View style={styles.rosterProgressBg}>
                    <View style={[styles.rosterProgressFg, { width: `${custStats.progressPercentage}%` }]} />
                  </View>
                  <Text style={styles.rosterProgressPercent}>{Math.round(custStats.progressPercentage)}%</Text>
                </View>

                {/* Footer Action */}
                <View style={styles.custRosterFooter}>
                  <Text style={styles.custRosterSchedule}>
                    ₹{c.collectionAmount.toLocaleString('en-IN')} / {formatFrequency(c.frequency)} · Due: {formatDateShort(c.nextPaymentDate)}
                  </Text>
                  <TouchableOpacity
                    style={styles.manageCustBtn}
                    onPress={() => navigation.navigate('CustomerDetail', { customerId: c.id })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.manageCustBtnText}>Manage →</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}

        {/* RECENT COLLECTIONS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Collections</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Collections')}>
            <Text style={styles.sectionLink}>View All →</Text>
          </TouchableOpacity>
        </View>

        {recentCollections.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No collections recorded yet.</Text>
          </Card>
        ) : (
          recentCollections.map((item) => (
            <Card key={item.id} style={styles.collectionRowCard} padding={SPACING.sm + 4}>
              <View style={styles.rowContent}>
                <View>
                  <Text style={styles.rowName}>{item.customerName}</Text>
                  <Text style={styles.rowDate}>{formatDateShort(item.date)} · {item.method}</Text>
                </View>
                <View style={styles.amountContainer}>
                  <Text style={styles.rowAmount}>+₹{item.amount.toLocaleString('en-IN')}</Text>
                  <TouchableOpacity
                    style={styles.rowReceiptBtn}
                    onPress={() => navigation.navigate('ReceiptDetail', { receiptId: item.receiptId })}
                  >
                    <Text style={styles.rowReceiptText}>Receipt</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))
        )}

        {/* Data Reset (Test helper) */}
        <TouchableOpacity style={styles.resetBtn} onPress={() => resetData()}>
          <Text style={styles.resetBtnText}>Reset Application Data</Text>
        </TouchableOpacity>
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
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  profileBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  profileBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 12,
  },
  roleBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  roleBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 12,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexGrow: 1,
  },
  profileWarningBanner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  profileWarningIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileWarningIcon: {
    fontSize: 18,
  },
  profileWarningTitle: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#92400E',
  },
  profileWarningSub: {
    ...TYPOGRAPHY.caption,
    color: '#78350F',
    lineHeight: 14,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
    marginBottom: SPACING.md,
  },
  gridCol: {
    width: '50%',
    paddingHorizontal: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  statCard: {
    padding: SPACING.md,
  },
  statLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  statValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginTop: 4,
  },
  collectedCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  collectedLabel: {
    color: COLORS.success,
  },
  collectedValue: {
    color: COLORS.success,
  },
  outstandingCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  outstandingLabel: {
    color: COLORS.danger,
  },
  outstandingValue: {
    color: COLORS.danger,
  },
  progressCard: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  progressTitle: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
  },
  progressPercent: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressBarFg: {
    height: '100%',
    backgroundColor: COLORS.secondary,
  },
  progressDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  sectionSubtitleText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  sectionLink: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
  },
  // Overdue section
  overdueSectionCard: {
    borderColor: '#FCA5A5',
    borderWidth: 1,
    backgroundColor: '#FFF5F5',
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  overdueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  overdueBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  overdueBadgeIcon: {
    fontSize: 16,
  },
  overdueBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  overdueTotalAmount: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#DC2626',
  },
  dueItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  custNameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  dueCustName: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
  },
  custIdPill: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  custIdPillText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10,
    color: '#2563EB',
    fontFamily: 'monospace',
  },
  overdueDaysText: {
    ...TYPOGRAPHY.captionBold,
    color: '#DC2626',
    fontSize: 11,
    marginTop: 1,
  },
  dueAmountSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  dueActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dueCollectBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dueCollectBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 11,
  },
  dueWaBtn: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  dueWaBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: '#16A34A',
    fontSize: 11,
  },
  // Due today section
  dueTodaySectionCard: {
    borderColor: '#FDE68A',
    borderWidth: 1,
    backgroundColor: '#FFFDF5',
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  dueTodayHeaderRow: {
    marginBottom: SPACING.xs,
  },
  dueTodayTitle: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#B45309',
  },
  // Upcoming
  upcomingCard: {
    backgroundColor: '#F8FAFC',
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  upcomingTitle: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  upcomingItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  upcomingCustName: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.primary,
  },
  upcomingDateText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
  },
  // All clear
  allClearCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },
  allClearIcon: {
    fontSize: 24,
    color: '#16A34A',
    fontWeight: '700',
    marginBottom: 4,
  },
  allClearTitle: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#15803D',
  },
  allClearSub: {
    ...TYPOGRAPHY.caption,
    color: '#166534',
    marginTop: 2,
  },
  // Roster card
  custRosterCard: {
    marginBottom: SPACING.sm + 2,
  },
  custRosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  custRosterName: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
    fontSize: 15,
  },
  custRosterPhone: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusBadgeOverdue: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgeText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10,
    color: '#16A34A',
  },
  statusBadgeTextOverdue: {
    color: '#DC2626',
  },
  custRosterDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs + 2,
  },
  custRosterGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  custGridCol: {
    alignItems: 'flex-start',
  },
  custGridLabel: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 9,
    color: COLORS.textLight,
  },
  custGridVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
    fontSize: 11,
  },
  custGridValPaid: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.success,
    fontSize: 11,
  },
  custGridValRem: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.danger,
    fontSize: 11,
  },
  rosterProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  rosterProgressBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  rosterProgressFg: {
    height: '100%',
    backgroundColor: COLORS.success,
  },
  rosterProgressPercent: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  custRosterFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  custRosterSchedule: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 10,
  },
  manageCustBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  manageCustBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 11,
  },
  collectionRowCard: {
    marginBottom: SPACING.xs,
  },
  rowContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowName: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
  },
  rowDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  rowAmount: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.success,
  },
  rowReceiptBtn: {
    marginTop: 2,
  },
  rowReceiptText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 10,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  emptyText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  resetBtn: {
    alignSelf: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.lg,
  },
  resetBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
  },
});

export default DashboardScreen;
