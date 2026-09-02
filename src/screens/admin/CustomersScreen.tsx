import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Card from '../../components/Card';
import { formatFrequency, formatDateShort } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const CustomersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { customers, schemes, getCustomerStats, logout } = useChitData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'ACTIVE' | 'SETTLED'>('ALL');

  const customerData = customers.map((c) => {
    const stats = getCustomerStats(c.id);
    const scheme = schemes.find((s) => s.id === c.schemeId);
    const isSettled = stats.remainingAmount === 0;
    return {
      customer: c,
      stats,
      scheme,
      isSettled,
    };
  });

  const activeCount = customerData.filter((item) => !item.isSettled).length;
  const settledCount = customerData.filter((item) => item.isSettled).length;

  const filteredItems = customerData.filter(({ customer, scheme, isSettled }) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      customer.name.toLowerCase().includes(query) ||
      customer.phone.includes(query) ||
      (scheme && scheme.name.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (filterType === 'ACTIVE') return !isSettled;
    if (filterType === 'SETTLED') return isSettled;
    return true;
  });

  const renderCustomerItem = ({ item }: { item: typeof customerData[0] }) => {
    const { customer, stats, scheme, isSettled } = item;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
        activeOpacity={0.8}
        style={styles.cardWrapper}
      >
        <Card style={styles.customerCard}>
          {/* Top Row: Customer Info + Member Badge */}
          <View style={styles.cardHeader}>
            <View style={styles.customerNameSection}>
              <View style={styles.nameRow}>
                <Text style={styles.nameText}>{customer.name}</Text>
                <View style={[styles.memberBadge, isSettled ? styles.settledBadge : styles.activeBadge]}>
                  <Text style={[styles.memberBadgeText, isSettled ? styles.settledBadgeText : styles.activeBadgeText]}>
                    {isSettled ? '✓ Fully Settled' : 'Active Member'}
                  </Text>
                </View>
              </View>
              <Text style={styles.phoneText}>+91 {customer.phone}</Text>
              <Text style={styles.schemeTagText}>
                {scheme ? scheme.name : 'Chit Scheme'} · {formatFrequency(customer.frequency)}
              </Text>
            </View>

            <View style={styles.viewProfileBtn}>
              <Text style={styles.viewProfileText}>View Profile →</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Financial Overview Row */}
          <View style={styles.financialRow}>
            <View style={styles.finCol}>
              <Text style={styles.finLabel}>SCHEME VALUE</Text>
              <Text style={styles.finValue}>₹{customer.amountGiven.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.finCol}>
              <Text style={styles.finLabel}>TOTAL PAID</Text>
              <Text style={[styles.finValue, styles.paidText]}>
                ₹{stats.paidAmount.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.finCol}>
              <Text style={styles.finLabel}>REMAINING</Text>
              <Text style={[styles.finValue, styles.remText]}>
                ₹{stats.remainingAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressBar, { width: `${stats.progressPercentage}%` }]} />
            </View>
            <Text style={styles.progressPercentageText}>{Math.round(stats.progressPercentage)}% Paid</Text>
          </View>

          {/* Member Metadata Footer */}
          <View style={styles.memberFooter}>
            <Text style={styles.memberFooterText}>
              Joined: {formatDateShort(customer.startDate)}
            </Text>
            <Text style={styles.memberFooterText}>
              {stats.totalPayments} {stats.totalPayments === 1 ? 'payment' : 'payments'} recorded
            </Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Customers</Text>
          <Text style={styles.headerSubtitle}>Directory of registered members</Text>
        </View>
        <TouchableOpacity style={styles.roleBtn} onPress={() => logout()}>
          <Text style={styles.roleBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone or scheme..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            keyboardType="default"
            autoCapitalize="none"
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'ALL' && styles.filterChipActive]}
            onPress={() => setFilterType('ALL')}
          >
            <Text style={[styles.filterChipText, filterType === 'ALL' && styles.filterChipTextActive]}>
              All ({customers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterType === 'ACTIVE' && styles.filterChipActive]}
            onPress={() => setFilterType('ACTIVE')}
          >
            <Text style={[styles.filterChipText, filterType === 'ACTIVE' && styles.filterChipTextActive]}>
              Active ({activeCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterType === 'SETTLED' && styles.filterChipActive]}
            onPress={() => setFilterType('SETTLED')}
          >
            <Text style={[styles.filterChipText, filterType === 'SETTLED' && styles.filterChipTextActive]}>
              Settled ({settledCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Customer Directory List */}
        {filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No members found.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            renderItem={renderCustomerItem}
            keyExtractor={(item) => item.customer.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Floating Add Customer Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddCustomer')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
    backgroundColor: COLORS.white,
  },
  searchInput: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.text,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.xs,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  filterChipText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 110,
  },
  cardWrapper: {
    marginBottom: SPACING.md,
  },
  customerCard: {
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerNameSection: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs + 2,
    marginBottom: 2,
  },
  nameText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  phoneText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  schemeTagText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  memberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  memberBadgeText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10,
  },
  activeBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  activeBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#2563EB',
    fontSize: 10,
  },
  settledBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  settledBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#059669',
    fontSize: 10,
  },
  viewProfileBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewProfileText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  finCol: {
    flex: 1,
  },
  finLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    fontSize: 9,
  },
  finValue: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
    marginTop: 2,
  },
  paidText: {
    color: COLORS.success,
  },
  remText: {
    color: COLORS.text,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
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
    backgroundColor: COLORS.secondary,
    borderRadius: 3,
  },
  progressPercentageText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 10,
    width: 55,
    textAlign: 'right',
  },
  memberFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs + 2,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  memberFooterText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.lg,
  },
  fabText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '300',
    lineHeight: 32,
    marginTop: -2,
  },
});

export default CustomersScreen;
