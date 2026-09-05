import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Card from '../../components/Card';
import { formatDateShort, getPaymentStatusInfo, formatFrequency } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { getAdminStats, customers, payments, schemes, resetData, logout, getCustomerStats } = useChitData();
  const stats = getAdminStats();

  const schemeDistribution = schemes.map((s) => {
    const enrolledMembers = customers.filter((c) => c.schemeId === s.id);
    const totalAllocated = enrolledMembers.reduce((sum, c) => sum + c.amountGiven, 0);
    return {
      scheme: s,
      members: enrolledMembers,
      count: enrolledMembers.length,
      totalAllocated,
    };
  });

  const overdueCustomers = customers.filter((c) => {
    const custStats = getCustomerStats(c.id);
    const info = getPaymentStatusInfo(c.nextPaymentDate, custStats.remainingAmount, c.frequency);
    return info.isOverdue;
  });

  const totalOverdueDues = overdueCustomers.reduce((sum, c) => sum + c.collectionAmount, 0);
  const recentCollections = payments.slice(0, 5); // top 5 recent payments

  const handleReset = () => {
    resetData();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>ChitFlow Admin</Text>
          <Text style={styles.headerSubtitle}>Overview of Chit Operations</Text>
        </View>
        <TouchableOpacity style={styles.roleBtn} onPress={() => logout()}>
          <Text style={styles.roleBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Overdue Payment Urgent Banner */}
        {overdueCustomers.length > 0 && (
          <TouchableOpacity
            style={styles.overdueBannerCard}
            onPress={() => navigation.navigate('Collections')}
            activeOpacity={0.9}
          >
            <View style={styles.overdueBannerHeader}>
              <View style={styles.overdueIconBadge}>
                <Text style={styles.overdueIconText}>⚠️</Text>
              </View>
              <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                <Text style={styles.overdueBannerTitle}>
                  {overdueCustomers.length} Customer{overdueCustomers.length > 1 ? 's' : ''} Overdue (Unpaid)
                </Text>
                <Text style={styles.overdueBannerSubtitle}>
                  ₹{totalOverdueDues.toLocaleString('en-IN')} overdue installment dues pending
                </Text>
              </View>
              <Text style={styles.overdueActionText}>View →</Text>
            </View>

            <View style={styles.overduePillRow}>
              {overdueCustomers.slice(0, 3).map((c) => {
                const custStats = getCustomerStats(c.id);
                const info = getPaymentStatusInfo(c.nextPaymentDate, custStats.remainingAmount, c.frequency);
                return (
                  <View key={c.id} style={styles.overdueCustomerPill}>
                    <Text style={styles.overduePillName}>{c.name}</Text>
                    <Text style={styles.overduePillDays}>({info.statusText})</Text>
                  </View>
                );
              })}
              {overdueCustomers.length > 3 && (
                <Text style={styles.overdueMoreText}>+{overdueCustomers.length - 3} more</Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* KPI Grid */}
        <View style={styles.grid}>
          <View style={styles.gridCol}>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>CUSTOMERS</Text>
              <Text style={styles.statValue}>{stats.totalCustomers}</Text>
            </Card>
          </View>
          <View style={styles.gridCol}>
            <Card style={styles.statCard}>
              <Text style={styles.statLabel}>TOTAL GIVEN</Text>
              <Text style={styles.statValue}>₹{stats.totalGiven.toLocaleString('en-IN')}</Text>
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
            <Text style={styles.progressTitle}>Collection Progress</Text>
            <Text style={styles.progressPercent}>{stats.collectionProgress.toFixed(1)}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFg, { width: `${stats.collectionProgress}%` }]} />
          </View>
          <Text style={styles.progressDesc}>
            ₹{stats.totalCollected.toLocaleString('en-IN')} collected out of ₹{stats.totalGiven.toLocaleString('en-IN')} overall limit
          </Text>
        </Card>

        {/* Scheme Allocations & Customer Distribution Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Scheme Allocations & Active Members</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Schemes')}>
            <Text style={styles.sectionLink}>Manage Schemes →</Text>
          </TouchableOpacity>
        </View>

        {schemeDistribution.map(({ scheme: s, members, count, totalAllocated }) => (
          <Card key={s.id} style={styles.schemeAllocCard} padding={SPACING.md}>
            <View style={styles.schemeAllocHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.schemeAllocName}>{s.name}</Text>
                <Text style={styles.schemeAllocTerms}>
                  ₹{s.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(s.frequency)} ({s.durationWeeksOrMonths} collections)
                </Text>
              </View>
              <View style={[styles.schemeAllocBadge, count > 0 && styles.schemeAllocBadgeActive]}>
                <Text style={[styles.schemeAllocBadgeText, count > 0 && styles.schemeAllocBadgeTextActive]}>
                  {count} {count === 1 ? 'Member' : 'Members'}
                </Text>
              </View>
            </View>

            <View style={styles.schemeAllocDivider} />

            <View style={styles.schemeAllocMetricsRow}>
              <View>
                <Text style={styles.schemeAllocMetricLabel}>TOTAL ALLOCATED</Text>
                <Text style={styles.schemeAllocMetricVal}>
                  ₹{totalAllocated.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: SPACING.md }}>
                <Text style={styles.schemeAllocMetricLabel}>MEMBERS ENROLLED</Text>
                <Text style={styles.schemeAllocMembersText} numberOfLines={1}>
                  {members.length > 0
                    ? members.map((m) => m.name).join(', ')
                    : 'No active members'}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        {/* Recent Collections */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Collections</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Collections')}>
            <Text style={styles.sectionLink}>View All</Text>
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

        {/* System Reset for Testing */}
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
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
    paddingTop: SPACING.xl,
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
  roleBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  roleBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 110,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },
  overdueBannerCard: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderLeftWidth: 6,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  overdueBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overdueIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueIconText: {
    fontSize: 18,
  },
  overdueBannerTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: '#991B1B',
  },
  overdueBannerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: '#B91C1C',
    marginTop: 2,
  },
  overdueActionText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#DC2626',
    marginLeft: SPACING.xs,
  },
  overduePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
  },
  overdueCustomerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  overduePillName: {
    ...TYPOGRAPHY.captionBold,
    color: '#991B1B',
    fontSize: 11,
  },
  overduePillDays: {
    ...TYPOGRAPHY.caption,
    color: '#DC2626',
    fontSize: 10,
    marginLeft: 3,
  },
  overdueMoreText: {
    ...TYPOGRAPHY.captionBold,
    color: '#DC2626',
    fontSize: 11,
    alignSelf: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
    marginBottom: SPACING.md,
  },
  gridCol: {
    width: '50%',
    padding: SPACING.xs,
  },
  statCard: {
    padding: SPACING.md,
    height: 96,
    justifyContent: 'center',
  },
  statLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
  },
  statValue: {
    ...TYPOGRAPHY.amountMedium,
    color: COLORS.text,
    marginTop: 4,
  },
  collectedCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  collectedLabel: {
    color: COLORS.success,
  },
  collectedValue: {
    color: COLORS.success,
  },
  outstandingCard: {
    borderLeftWidth: 4,
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
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
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
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressBarFg: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: 4,
  },
  progressDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  sectionLink: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.secondary,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  emptyText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
  },
  collectionRowCard: {
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowName: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
  },
  rowDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  rowAmount: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.success,
  },
  rowReceiptBtn: {
    marginTop: 4,
    backgroundColor: COLORS.secondaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rowReceiptText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 9,
  },
  resetBtn: {
    alignSelf: 'center',
    marginTop: SPACING.xxl,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 8,
  },
  resetBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.danger,
  },
  // Scheme Allocations Styles
  schemeAllocCard: {
    marginBottom: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  schemeAllocHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  schemeAllocName: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
  },
  schemeAllocTerms: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  schemeAllocBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  schemeAllocBadgeActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  schemeAllocBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 10,
  },
  schemeAllocBadgeTextActive: {
    color: '#059669',
  },
  schemeAllocDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  schemeAllocMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  schemeAllocMetricLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  schemeAllocMetricVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.success,
    marginTop: 1,
  },
  schemeAllocMembersText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
    marginTop: 1,
  },
});

export default DashboardScreen;
