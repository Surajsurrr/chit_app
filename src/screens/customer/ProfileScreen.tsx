import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import Card from '../../components/Card';
import { formatDateLong } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedCustomerId, customers, schemes, getCustomerStats, logout } = useChitData();

  const customer = customers.find((c) => c.id === selectedCustomerId);

  if (!customer) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Customer account not selected.</Text>
      </SafeAreaView>
    );
  }

  const scheme = schemes.find((s) => s.id === customer.schemeId);
  const stats = getCustomerStats(customer.id);

  const nameInitials = customer.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <Text style={styles.headerSubtitle}>Account settings and member details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <Card style={styles.userCard} padding={SPACING.lg}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{nameInitials}</Text>
          </View>
          <Text style={styles.userName}>{customer.name}</Text>
          <Text style={styles.userPhone}>+91 {customer.phone}</Text>
          <View style={styles.memberIdBadge}>
            <Text style={styles.memberIdText}>MEMBER ID: {customer.id.toUpperCase()}</Text>
          </View>
        </Card>

        {/* Scheme Terms summary */}
        <Text style={styles.sectionTitle}>Account & Scheme Terms</Text>
        <Card style={styles.detailsCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Associated Scheme</Text>
            <Text style={styles.value}>{scheme ? scheme.name : 'Active Scheme'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Scheme Value Limit</Text>
            <Text style={styles.value}>₹{customer.amountGiven.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Installment Dues</Text>
            <Text style={styles.value}>₹{customer.collectionAmount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Schedule Frequency</Text>
            <Text style={[styles.value, styles.capitalize]}>{customer.frequency.replace(/_/g, ' ')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Registration Date</Text>
            <Text style={styles.value}>{formatDateLong(customer.startDate)}</Text>
          </View>
        </Card>

        {/* Financial progress brief */}
        <Card style={styles.progressBriefCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressTitle}>Financial Progress</Text>
            <Text style={styles.progressText}>{stats.progressPercentage.toFixed(1)}% Paid</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFg, { width: `${stats.progressPercentage}%` }]} />
          </View>
          <Text style={styles.remainingText}>
            ₹{stats.remainingAmount.toLocaleString('en-IN')} outstanding of ₹{customer.amountGiven.toLocaleString('en-IN')} total
          </Text>
        </Card>

        {/* Navigation / Role switch action */}
        <TouchableOpacity
          style={styles.switchRoleBtn}
          onPress={() => logout()}
        >
          <Text style={styles.switchRoleText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.footerBuild}>ChitFlow Mobile App · Build v1.0.0 (Expo Go Demo)</Text>
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
  scrollContent: {
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },
  userCard: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    ...TYPOGRAPHY.h1,
    color: COLORS.success,
  },
  userName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  userPhone: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  memberIdBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.md,
  },
  memberIdText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  detailsCard: {
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
  },
  value: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
  progressBriefCard: {
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  progressTitle: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
  },
  progressText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.success,
  },
  progressBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFg: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  remainingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  switchRoleBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.white,
  },
  switchRoleText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.danger,
  },
  footerBuild: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
    color: COLORS.textLight,
    marginBottom: SPACING.xl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.danger,
  },
});

export default ProfileScreen;
