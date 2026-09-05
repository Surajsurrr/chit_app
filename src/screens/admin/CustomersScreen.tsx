import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { Customer } from '../../data/mockData';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Card from '../../components/Card';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import { formatFrequency, formatDateShort, getPaymentStatusInfo } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const CustomersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { customers, schemes, getCustomerStats, recordPayment, selectCustomer, logout } = useChitData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'ACTIVE' | 'SETTLED'>('ALL');

  // Collection modal states
  const [isCollectModalVisible, setIsCollectModalVisible] = useState(false);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Card' | 'Bank Transfer'>('Cash');
  const [collectError, setCollectError] = useState('');

  const customerData = customers.map((c) => {
    const stats = getCustomerStats(c.id);
    const scheme = schemes.find((s) => s.id === c.schemeId);
    const isSettled = stats.remainingAmount === 0;
    const statusInfo = getPaymentStatusInfo(c.nextPaymentDate, stats.remainingAmount, c.frequency);
    return {
      customer: c,
      stats,
      scheme,
      isSettled,
      statusInfo,
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

  const handleOpenCollect = (cust: Customer) => {
    setSelectedCust(cust);
    setCollectAmount(cust.collectionAmount.toString());
    setPaymentMethod('Cash');
    setCollectError('');
    setIsCollectModalVisible(true);
  };

  const handleConfirmCollection = () => {
    if (!selectedCust) return;

    const amount = parseFloat(collectAmount);
    if (isNaN(amount) || amount <= 0) {
      setCollectError('Please enter a valid collection amount');
      return;
    }

    const custStats = getCustomerStats(selectedCust.id);
    if (amount > custStats.remainingAmount) {
      setCollectError(
        `Amount cannot exceed remaining balance of ₹${custStats.remainingAmount.toLocaleString('en-IN')}`
      );
      return;
    }

    const result = recordPayment(selectedCust.id, amount, paymentMethod);
    if (result.success && result.receipt) {
      const receiptId = result.receipt.id;
      selectCustomer(selectedCust.id);
      setIsCollectModalVisible(false);
      setSelectedCust(null);

      // Automatically show the downloadable invoice proof
      navigation.navigate('ReceiptDetail', {
        receiptId,
        autoDownload: true,
        isNewPayment: true,
      });
    } else {
      setCollectError(result.error || 'Failed to record collection');
    }
  };

  const renderCustomerItem = ({ item }: { item: typeof customerData[0] }) => {
    const { customer, stats, scheme, isSettled, statusInfo } = item;

    return (
      <View style={styles.cardWrapper}>
        <Card style={styles.customerCard}>
          {/* Top Row: Customer Info + Member Badge & Action Buttons */}
          <View style={styles.cardHeader}>
            <TouchableOpacity
              style={styles.customerNameSection}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
              activeOpacity={0.7}
            >
              <View style={styles.nameRow}>
                <Text style={styles.nameText}>{customer.name}</Text>
                <View
                  style={[
                    styles.memberBadge,
                    isSettled
                      ? styles.settledBadge
                      : statusInfo.isOverdue
                      ? styles.overdueBadge
                      : statusInfo.status === 'DUE_TODAY'
                      ? styles.dueTodayBadge
                      : styles.activeBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.memberBadgeText,
                      isSettled
                        ? styles.settledBadgeText
                        : statusInfo.isOverdue
                        ? styles.overdueBadgeText
                        : statusInfo.status === 'DUE_TODAY'
                        ? styles.dueTodayBadgeText
                        : styles.activeBadgeText,
                    ]}
                  >
                    {isSettled
                      ? '✓ Fully Settled'
                      : statusInfo.isOverdue
                      ? `⚠️ ${statusInfo.statusText}`
                      : statusInfo.status === 'DUE_TODAY'
                      ? 'Due Today'
                      : 'Active Member'}
                  </Text>
                </View>
              </View>
              <Text style={styles.phoneText}>+91 {customer.phone}</Text>
              <Text style={styles.schemeTagText}>
                {scheme ? scheme.name : 'Chit Scheme'} · {formatFrequency(customer.frequency)}
              </Text>
            </TouchableOpacity>

            {/* Action Buttons: Collected Button beside View Profile */}
            <View style={styles.headerButtonsContainer}>
              {!isSettled ? (
                <TouchableOpacity
                  style={[styles.collectedBtn, statusInfo.isOverdue && styles.collectedBtnOverdue]}
                  onPress={() => handleOpenCollect(customer)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.collectedBtnText}>
                    {statusInfo.isOverdue ? 'Collect ⚠️' : '✓ Collected'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.settledTag}>
                  <Text style={styles.settledTagText}>✓ Settled</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.viewProfileBtn}
                onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
                activeOpacity={0.7}
              >
                <Text style={styles.viewProfileText}>View Profile →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Navigates to details on tapping the financial summary / progress area */}
          <TouchableOpacity
            onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
            activeOpacity={0.8}
          >
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
          </TouchableOpacity>
        </Card>
      </View>
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

      {/* Record Collection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isCollectModalVisible}
        onRequestClose={() => setIsCollectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={styles.modalIconBadge}>
                  <Text style={{ fontSize: 16 }}>💰</Text>
                </View>
                <View>
                  <Text style={styles.modalTitle}>Record Collection</Text>
                  <Text style={styles.modalSubtitle}>Update customer collected amount</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsCollectModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedCust && (() => {
              const custStats = getCustomerStats(selectedCust.id);
              const custScheme = schemes.find((s) => s.id === selectedCust.schemeId);
              const statusInfo = getPaymentStatusInfo(
                selectedCust.nextPaymentDate,
                custStats.remainingAmount,
                selectedCust.frequency
              );

              return (
                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  {/* Customer summary card */}
                  <View style={styles.modalCustCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalCustName}>{selectedCust.name}</Text>
                      <Text style={styles.modalCustPhone}>+91 {selectedCust.phone}</Text>
                      <Text style={styles.modalCustScheme}>
                        {custScheme ? custScheme.name : 'Chit Scheme'} · {formatFrequency(selectedCust.frequency)}
                      </Text>
                    </View>
                    <View style={styles.modalBalanceBox}>
                      <Text style={styles.modalBalanceLabel}>REMAINING</Text>
                      <Text style={styles.modalBalanceVal}>
                        ₹{custStats.remainingAmount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  {/* Overdue clearing notice banner */}
                  {statusInfo.isOverdue && (
                    <View style={styles.modalOverdueBanner}>
                      <Text style={styles.modalOverdueIcon}>⚠️</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalOverdueTitle}>Overdue Installment ({statusInfo.statusText})</Text>
                        <Text style={styles.modalOverdueDesc}>
                          Scheduled installment: ₹{selectedCust.collectionAmount.toLocaleString('en-IN')}. Recording this collection will clear the overdue status and schedule the next installment cycle.
                        </Text>
                      </View>
                    </View>
                  )}

                  {collectError ? <Text style={styles.modalError}>{collectError}</Text> : null}

                  {/* Amount Input */}
                  <FormInput
                    label="Collection Amount (₹)"
                    placeholder="Enter amount collected"
                    value={collectAmount}
                    onChangeText={(val) => {
                      setCollectAmount(val);
                      setCollectError('');
                    }}
                    keyboardType="numeric"
                  />

                  {/* Quick Amount Suggestion Chips */}
                  <View style={styles.quickChipsRow}>
                    <TouchableOpacity
                      style={styles.quickChip}
                      onPress={() => setCollectAmount(selectedCust.collectionAmount.toString())}
                    >
                      <Text style={styles.quickChipText}>
                        ₹{selectedCust.collectionAmount.toLocaleString('en-IN')} (1x Due)
                      </Text>
                    </TouchableOpacity>

                    {custStats.remainingAmount >= selectedCust.collectionAmount * 2 && (
                      <TouchableOpacity
                        style={styles.quickChip}
                        onPress={() => setCollectAmount((selectedCust.collectionAmount * 2).toString())}
                      >
                        <Text style={styles.quickChipText}>
                          ₹{(selectedCust.collectionAmount * 2).toLocaleString('en-IN')} (2x Due)
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.quickChip}
                      onPress={() => setCollectAmount(custStats.remainingAmount.toString())}
                    >
                      <Text style={styles.quickChipText}>Full Settle</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Payment Method Selector */}
                  <Text style={styles.modalSectionLabel}>Payment Method</Text>
                  <View style={styles.methodGrid}>
                    {(['Cash', 'UPI', 'Bank Transfer', 'Card'] as const).map((method) => {
                      const isSelected = paymentMethod === method;
                      return (
                        <TouchableOpacity
                          key={method}
                          style={[
                            styles.methodBtn,
                            isSelected ? styles.methodBtnSelected : null,
                          ]}
                          onPress={() => setPaymentMethod(method)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.methodBtnText,
                              isSelected ? styles.methodBtnTextSelected : null,
                            ]}
                          >
                            {method}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Clarification info */}
                  <View style={styles.modalInfoNotice}>
                    <Text style={styles.modalInfoText}>
                      ✓ Automatically generates verified receipt & clears overdue in Collections tab.
                    </Text>
                  </View>

                  <Button
                    title="Confirm Collection & Clear Overdue"
                    onPress={handleConfirmCollection}
                    style={styles.modalSubmitBtn}
                    size="large"
                    variant="success"
                  />
                </ScrollView>
              );
            })()}
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
  overdueBadge: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  overdueBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#DC2626',
    fontSize: 10,
  },
  dueTodayBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  dueTodayBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#D97706',
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
  headerButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collectedBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  collectedBtnOverdue: {
    backgroundColor: '#EF4444',
  },
  collectedBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 11,
  },
  settledTag: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  settledTagText: {
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  modalSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  closeBtn: {
    padding: SPACING.xs,
  },
  closeBtnText: {
    fontSize: 20,
    color: COLORS.textMuted,
    fontWeight: 'bold',
  },
  modalScroll: {
    padding: SPACING.lg,
  },
  modalCustCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalCustName: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalCustPhone: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalCustScheme: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  modalBalanceBox: {
    alignItems: 'flex-end',
  },
  modalBalanceLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    fontSize: 9,
  },
  modalBalanceVal: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.danger,
    marginTop: 2,
  },
  modalOverdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    borderRadius: 10,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  modalOverdueIcon: {
    fontSize: 20,
  },
  modalOverdueTitle: {
    ...TYPOGRAPHY.captionBold,
    color: '#991B1B',
    fontSize: 11,
  },
  modalOverdueDesc: {
    ...TYPOGRAPHY.caption,
    color: '#7F1D1D',
    fontSize: 10,
    marginTop: 1,
  },
  modalError: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.danger,
    marginBottom: SPACING.sm,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs + 2,
    marginBottom: SPACING.md,
    marginTop: -SPACING.xs,
  },
  quickChip: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickChipText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 11,
  },
  modalSectionLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primaryLight,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 10,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
    marginBottom: SPACING.md,
  },
  methodBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: SPACING.sm + 2,
    margin: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
    width: '46%',
    flexGrow: 1,
  },
  methodBtnSelected: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  methodBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
  },
  methodBtnTextSelected: {
    color: COLORS.white,
  },
  modalInfoNotice: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  modalInfoText: {
    ...TYPOGRAPHY.captionBold,
    color: '#065F46',
    fontSize: 11,
    textAlign: 'center',
  },
  modalSubmitBtn: {
    marginBottom: SPACING.xl,
  },
});

export default CustomersScreen;
