import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import { getPaymentStatusInfo, formatFrequency } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const CustomersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { customers, getCustomerStats, logout } = useChitData();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | 'DUE_TODAY' | 'PAID'>('ALL');

  const customerDataWithStatus = customers.map((c) => {
    const stats = getCustomerStats(c.id);
    const statusInfo = getPaymentStatusInfo(c.nextPaymentDate, stats.remainingAmount, c.frequency);
    return {
      customer: c,
      stats,
      statusInfo,
    };
  });

  const overdueCount = customerDataWithStatus.filter((item) => item.statusInfo.isOverdue).length;
  const dueTodayCount = customerDataWithStatus.filter((item) => item.statusInfo.status === 'DUE_TODAY').length;

  const filteredItems = customerDataWithStatus.filter(({ customer, statusInfo }) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery);

    if (!matchesSearch) return false;

    if (statusFilter === 'OVERDUE') return statusInfo.isOverdue;
    if (statusFilter === 'DUE_TODAY') return statusInfo.status === 'DUE_TODAY';
    if (statusFilter === 'PAID') return statusInfo.status === 'PAID';
    return true;
  });

  const renderCustomerItem = ({ item }: { item: typeof customerDataWithStatus[0] }) => {
    const { customer, stats, statusInfo } = item;
    const isOverdue = statusInfo.isOverdue;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
        activeOpacity={0.8}
        style={styles.cardWrapper}
      >
        <Card
          style={styles.customerCard}
        >
          {/* Overdue Alert Bar */}
          {isOverdue && (
            <View style={styles.overdueAlertBar}>
              <Text style={styles.overdueAlertText}>
                ⚠️ Missed Payment · {statusInfo.statusText}
              </Text>
              <Text style={styles.overdueAmountTag}>
                ₹{customer.collectionAmount.toLocaleString('en-IN')} Due
              </Text>
            </View>
          )}

          <View style={styles.cardHeader}>
            <View style={styles.customerNameSection}>
              <View style={styles.nameRow}>
                <Text style={styles.nameText}>
                  {customer.name}
                </Text>
                <StatusBadge status={statusInfo.badgeLabel} />
              </View>
              <Text style={styles.phoneText}>+91 {customer.phone}</Text>
              <Text style={styles.schemeFrequencyText}>
                Scheme: ₹{customer.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(customer.frequency)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.collectBtn, isOverdue && styles.overdueCollectBtn]}
              onPress={() => navigation.navigate('Collections', { customerId: customer.id })}
            >
              <Text style={styles.collectBtnText}>
                {isOverdue ? 'Collect ⚠️' : 'Collect'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.financialRow}>
            <View style={styles.finCol}>
              <Text style={styles.finLabel}>TOTAL GIVEN</Text>
              <Text style={styles.finValue}>₹{customer.amountGiven.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.finCol}>
              <Text style={styles.finLabel}>PAID</Text>
              <Text style={[styles.finValue, styles.paidText]}>
                ₹{stats.paidAmount.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.finCol}>
              <Text style={styles.finLabel}>REMAINING</Text>
              <Text style={[styles.finValue, isOverdue ? styles.overdueRemText : styles.remText]}>
                ₹{stats.remainingAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Next Due Date indicator */}
          <View style={styles.dueFooterRow}>
            <Text style={styles.dueFooterLabel}>Next Due Date:</Text>
            <Text style={[styles.dueFooterDate, isOverdue && styles.overdueDueDateText]}>
              {statusInfo.formattedDueDate} ({statusInfo.statusText})
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
          <Text style={styles.headerSubtitle}>Manage and track member payments</Text>
        </View>
        <TouchableOpacity style={styles.roleBtn} onPress={() => logout()}>
          <Text style={styles.roleBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone..."
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
            style={[styles.filterChip, statusFilter === 'ALL' && styles.filterChipActive]}
            onPress={() => setStatusFilter('ALL')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'ALL' && styles.filterChipTextActive]}>
              All ({customers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              statusFilter === 'OVERDUE' && styles.filterChipOverdueActive,
              overdueCount > 0 && styles.filterChipOverdueWithCount,
            ]}
            onPress={() => setStatusFilter('OVERDUE')}
          >
            <Text
              style={[
                styles.filterChipText,
                overdueCount > 0 && styles.overdueChipLabel,
                statusFilter === 'OVERDUE' && styles.filterChipTextActive,
              ]}
            >
              ⚠️ Overdue ({overdueCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'DUE_TODAY' && styles.filterChipActive]}
            onPress={() => setStatusFilter('DUE_TODAY')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'DUE_TODAY' && styles.filterChipTextActive]}>
              Due Today ({dueTodayCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'PAID' && styles.filterChipActive]}
            onPress={() => setStatusFilter('PAID')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'PAID' && styles.filterChipTextActive]}>
              Settled
            </Text>
          </TouchableOpacity>
        </View>

        {filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No customers found in this filter.</Text>
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
    paddingHorizontal: SPACING.sm + 4,
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
  filterChipOverdueWithCount: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  filterChipOverdueActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  filterChipText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  overdueChipLabel: {
    color: '#DC2626',
    fontWeight: '700',
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
  },
  overdueCustomerCard: {
    backgroundColor: '#FFF5F5',
    borderLeftWidth: 5,
    borderLeftColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  overdueAlertBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  overdueAlertText: {
    ...TYPOGRAPHY.captionBold,
    color: '#B91C1C',
    fontSize: 11,
  },
  overdueAmountTag: {
    ...TYPOGRAPHY.captionBold,
    color: '#DC2626',
    fontSize: 11,
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
  overdueNameText: {
    color: '#991B1B',
  },
  phoneText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
  },
  schemeFrequencyText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  collectBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm - 2,
    borderRadius: 8,
  },
  overdueCollectBtn: {
    backgroundColor: '#DC2626',
    ...SHADOWS.sm,
  },
  collectBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
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
  overdueRemText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  dueFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs + 2,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dueFooterLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    marginRight: 4,
  },
  dueFooterDate: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.text,
  },
  overdueDueDateText: {
    color: '#DC2626',
    fontWeight: '700',
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
