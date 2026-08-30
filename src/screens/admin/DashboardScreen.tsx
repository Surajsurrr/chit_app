import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import Card from '../../components/Card';
import { formatDateShort } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { getAdminStats, payments, resetData, logout } = useChitData();
  const stats = getAdminStats();

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
    backgroundColor: COLORS.background,
    flexGrow: 1,
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
});

export default DashboardScreen;
