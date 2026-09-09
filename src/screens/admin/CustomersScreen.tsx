import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChitData } from '../../context/ChitDataContext';
import { Customer } from '../../data/mockData';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Card from '../../components/Card';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import { formatFrequency, formatDateShort, getPaymentStatusInfo } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const CustomersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { customers, getCustomerStats, getSchemeStats, recordPayment, selectCustomer } = useChitData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'OVERDUE' | 'DUE_TODAY' | 'ACTIVE' | 'SETTLED'>('ALL');

  // Collection modal states
  const [isCollectModalVisible, setIsCollectModalVisible] = useState(false);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<any | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Card' | 'Bank Transfer'>('Cash');
  const [collectError, setCollectError] = useState('');

  const customerData = customers.map((c) => {
    const stats = getCustomerStats(c.id);
    const hasSettledSchemes = Array.isArray(c.settledSchemes) && c.settledSchemes.length > 0;
    const enrolledList = Array.isArray(c.enrolledSchemes) ? c.enrolledSchemes : [];
    const totalVal = c.totalAmount || c.amountGiven || (hasSettledSchemes ? (c.settledSchemes || []).reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0) : 0);
    const isSettled = (totalVal > 0 && stats.remainingAmount === 0) || (hasSettledSchemes && enrolledList.length === 0);
    const statusInfo = getPaymentStatusInfo(c.nextPaymentDate, stats.remainingAmount, c.frequency);
    return {
      customer: c,
      stats,
      totalVal,
      isSettled,
      hasSettledSchemes,
      statusInfo,
    };
  });

  const overdueCount = customerData.filter((item) => item.statusInfo.isOverdue).length;
  const dueTodayCount = customerData.filter((item) => item.statusInfo.status === 'DUE_TODAY').length;
  const activeCount = customerData.filter((item) => !item.isSettled).length;
  const settledCount = customerData.filter((item) => item.isSettled || item.hasSettledSchemes).length;

  const filteredItems = customerData.filter(({ customer, isSettled, hasSettledSchemes, statusInfo }) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      customer.name.toLowerCase().includes(query) ||
      customer.phone.includes(query) ||
      customer.id.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (filterType === 'OVERDUE') return statusInfo.isOverdue;
    if (filterType === 'DUE_TODAY') return statusInfo.status === 'DUE_TODAY';
    if (filterType === 'ACTIVE') return !isSettled;
    if (filterType === 'SETTLED') return isSettled || hasSettledSchemes;
    return true;
  });

  const handleOpenCollect = (cust: Customer, schemeItem?: any) => {
    setSelectedCust(cust);
    const enrolled = Array.isArray(cust.enrolledSchemes) ? cust.enrolledSchemes : [];
    const targetScheme = schemeItem || (enrolled.length > 0 ? enrolled[0] : null);
    setSelectedScheme(targetScheme);
    if (targetScheme && targetScheme.collectionAmount) {
      setCollectAmount(targetScheme.collectionAmount.toString());
    } else {
      setCollectAmount(cust.collectionAmount.toString());
    }
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

    const schemeNameOrId = selectedScheme ? (selectedScheme.loanName || selectedScheme.id) : undefined;
    const stats = selectedScheme
      ? getSchemeStats(selectedCust.id, selectedScheme.id || selectedScheme.loanName)
      : getCustomerStats(selectedCust.id);

    if (amount > stats.remainingAmount) {
      setCollectError(
        `Amount cannot exceed remaining balance of ₹${stats.remainingAmount.toLocaleString('en-IN')}`
      );
      return;
    }

    const result = recordPayment(selectedCust.id, amount, paymentMethod, schemeNameOrId);
    if (result.success && result.receipt) {
      const customerName = selectedCust.name;
      if (result.hasRemainingSchemes) {
        selectCustomer(selectedCust.id);
      }
      setIsCollectModalVisible(false);
      setSelectedCust(null);
      setSelectedScheme(null);
      setCollectAmount('');
      setCollectError('');

      if (result.schemeCompleted) {
        if (result.hasRemainingSchemes) {
          Alert.alert(
            'Scheme Completed! 🎉',
            `Payment of ₹${amount.toLocaleString('en-IN')} recorded (Receipt #${result.receipt.receiptNumber}).\n\n${result.completedSchemeName || 'Scheme'} has completed all installments and has been closed!\n\n${customerName} still has ${result.remainingSchemesCount} active scheme(s).`
          );
        } else {
          Alert.alert(
            'All Installments Completed! 🎉',
            `Payment of ₹${amount.toLocaleString('en-IN')} recorded (Receipt #${result.receipt.receiptNumber}).\n\nAll installment payments for ${customerName} have been completed! The scheme details and customer profile have been closed.`
          );
        }
      } else {
        Alert.alert(
          'Collection Recorded! ✓',
          `Payment of ₹${amount.toLocaleString('en-IN')} has been recorded for ${customerName}${
            selectedScheme ? ` (${selectedScheme.loanName || 'Scheme'})` : ''
          }.\n\nReceipt #${result.receipt.receiptNumber} generated.`
        );
      }
    } else {
      setCollectError(result.error || 'Failed to record collection');
    }
  };

  const renderCustomerItem = ({ item }: { item: typeof customerData[0] }) => {
    const { customer, stats, totalVal, isSettled, statusInfo } = item;
    const payout = customer.payoutAmount ?? Math.max(0, totalVal - (customer.interestAmount || 0));
    const enrolledList: any[] = Array.isArray(customer.enrolledSchemes) ? customer.enrolledSchemes : [];
    const hasMultipleSchemes = enrolledList.length > 1;

    return (
      <View style={styles.cardWrapper}>
        <Card style={styles.customerCard}>
          {/* Top Row: Customer Info + ID Badge & Action Buttons */}
          <View style={styles.cardHeader}>
            <TouchableOpacity
              style={styles.customerNameSection}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
              activeOpacity={0.7}
            >
              <View style={styles.nameRow}>
                <Text style={styles.nameText}>{customer.name}</Text>
                <View style={styles.custIdBadge}>
                  <Text style={styles.custIdBadgeText}>{customer.id}</Text>
                </View>
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
                      : 'Active'}
                  </Text>
                </View>
                {hasMultipleSchemes && (
                  <View style={styles.multiSchemeCountBadge}>
                    <Text style={styles.multiSchemeCountBadgeText}>
                      {enrolledList.length} Schemes Active
                    </Text>
                  </View>
                )}
                {Array.isArray(customer.settledSchemes) && customer.settledSchemes.length > 0 && (
                  <View style={styles.settledCountBadge}>
                    <Text style={styles.settledCountBadgeText}>
                      ✓ {customer.settledSchemes.length} Settled
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.phoneText}>📞 +91 {customer.phone}</Text>
              {!hasMultipleSchemes && (
                <Text style={styles.scheduleText}>
                  ₹{customer.collectionAmount.toLocaleString('en-IN')} / {formatFrequency(customer.frequency)} · Next Due: {formatDateShort(customer.nextPaymentDate)}
                </Text>
              )}
            </TouchableOpacity>

            {/* Quick Actions (Header level: shown only for single scheme) */}
            <View style={styles.headerButtonsContainer}>
              {!hasMultipleSchemes && (!isSettled ? (
                <TouchableOpacity
                  style={[styles.collectedBtn, statusInfo.isOverdue && styles.collectedBtnOverdue]}
                  onPress={() => handleOpenCollect(customer)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.collectedBtnText}>
                    {statusInfo.isOverdue ? 'Collect ⚠️' : '✓ Collect'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.settledTag}>
                  <Text style={styles.settledTagText}>✓ Settled</Text>
                </View>
              ))}

              <TouchableOpacity
                style={styles.viewProfileBtn}
                onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
                activeOpacity={0.7}
              >
                <Text style={styles.viewProfileText}>View →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Individual Scheme Rows with Separate Collect Buttons */}
          {hasMultipleSchemes && (
            <View style={styles.multiSchemesList}>
              {enrolledList.map((schemeItem: any, idx: number) => {
                const sName = schemeItem.loanName || `Scheme #${idx + 1}`;
                const sPayout = Number(schemeItem.payoutAmount || 0);
                const sTotal = Number(schemeItem.totalAmount || (sPayout + Number(schemeItem.interestAmount || 0)));
                const sCol = Number(schemeItem.collectionAmount || 0);
                const sFreq = schemeItem.frequency || customer.frequency || 'daily';
                const sStats = getSchemeStats(customer.id, schemeItem.id || sName);
                const isSchemeSettled = sStats.remainingAmount === 0 && sTotal > 0;

                return (
                  <View key={schemeItem.id || idx} style={styles.schemeCardRow}>
                    <View style={styles.schemeCardLeft}>
                      <View style={styles.schemeCardTitleRow}>
                        <View style={styles.schemeNameBadge}>
                          <Text style={styles.schemeNameBadgeText}>{sName}</Text>
                        </View>
                        <Text style={styles.schemeCardSchedule}>
                          ₹{sCol.toLocaleString('en-IN')} / {formatFrequency(sFreq)}
                        </Text>
                      </View>
                      <View style={styles.schemeCardNumbers}>
                        <Text style={styles.schemeCardNum}>
                          Disbursed: <Text style={{ fontWeight: '700', color: '#2563EB' }}>₹{sPayout.toLocaleString('en-IN')}</Text>
                        </Text>
                        <Text style={styles.schemeCardNum}>
                          Total: <Text style={{ fontWeight: '700', color: COLORS.primary }}>₹{sTotal.toLocaleString('en-IN')}</Text>
                        </Text>
                        <Text style={styles.schemeCardNum}>
                          Paid: <Text style={{ fontWeight: '700', color: COLORS.success }}>₹{sStats.paidAmount.toLocaleString('en-IN')}</Text>
                        </Text>
                        <Text style={styles.schemeCardNum}>
                          Rem: <Text style={{ fontWeight: '700', color: COLORS.danger }}>₹{sStats.remainingAmount.toLocaleString('en-IN')}</Text>
                        </Text>
                      </View>
                    </View>

                    <View style={styles.schemeCardRight}>
                      {!isSchemeSettled ? (
                        <TouchableOpacity
                          style={styles.schemeCollectBtn}
                          onPress={() => handleOpenCollect(customer, schemeItem)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.schemeCollectBtnText}>✓ Collect {sName}</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.schemeSettledBadge}>
                          <Text style={styles.schemeSettledBadgeText}>✓ Settled</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Financial Parameters Row */}
          <TouchableOpacity
            onPress={() => navigation.navigate('CustomerDetail', { customerId: customer.id })}
            activeOpacity={0.8}
          >
            <View style={styles.divider} />

            <View style={styles.financialRow}>
              <View style={styles.finCol}>
                <Text style={styles.finLabel}>DISBURSED</Text>
                <Text style={styles.finValue}>₹{payout.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.finCol}>
                <Text style={styles.finLabel}>TOTAL REPAY</Text>
                <Text style={styles.finValue}>₹{totalVal.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.finCol}>
                <Text style={styles.finLabel}>PAID</Text>
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
              <Text style={styles.progressPercentageText}>{Math.round(stats.progressPercentage)}%</Text>
            </View>
          </TouchableOpacity>
        </Card>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Customers & Ledgers</Text>
          <Text style={styles.headerSubtitle}>
            {activeCount} active borrowers · {customerData.length} total
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addCustomerBtn}
          onPress={() => navigation.navigate('AddCustomer')}
          activeOpacity={0.85}
        >
          <Text style={styles.addCustomerBtnText}>+ Add Customer</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by ID (e.g. CUST-101), Name, or Phone..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterType === 'ALL' && styles.filterChipActive]}
            onPress={() => setFilterType('ALL')}
          >
            <Text style={[styles.filterChipText, filterType === 'ALL' && styles.filterChipTextActive]}>
              All ({customerData.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              filterType === 'OVERDUE' && styles.filterChipActiveOverdue,
              overdueCount > 0 && styles.filterChipHasOverdue,
            ]}
            onPress={() => setFilterType('OVERDUE')}
          >
            <Text
              style={[
                styles.filterChipText,
                filterType === 'OVERDUE' && styles.filterChipTextActive,
                overdueCount > 0 && { color: filterType === 'OVERDUE' ? COLORS.white : '#DC2626' },
              ]}
            >
              ⚠️ Overdue ({overdueCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterType === 'DUE_TODAY' && styles.filterChipActive]}
            onPress={() => setFilterType('DUE_TODAY')}
          >
            <Text style={[styles.filterChipText, filterType === 'DUE_TODAY' && styles.filterChipTextActive]}>
              Due Today ({dueTodayCount})
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
        </ScrollView>
      </View>

      {/* Customer List */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.customer.id}
        renderItem={renderCustomerItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No Customers Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try searching with a different name, ID, or phone number' : 'Click "+ Add Customer" above to add your first customer'}
            </Text>
          </View>
        }
      />

      {/* Quick Collection Modal */}
      {selectedCust && (
        <Modal
          visible={isCollectModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsCollectModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalBackdrop}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Record Collection</Text>
                  <Text style={styles.modalSubtitle}>
                    {selectedCust.name} ({selectedCust.id})
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setIsCollectModalVisible(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {collectError ? <Text style={styles.errorTextBanner}>{collectError}</Text> : null}

              {/* Scheme Picker (if customer has multiple schemes) */}
              {Array.isArray(selectedCust.enrolledSchemes) && selectedCust.enrolledSchemes.length > 1 && (
                <View style={{ marginBottom: SPACING.md }}>
                  <Text style={styles.fieldLabel}>Select Scheme to Collect</Text>
                  <View style={styles.modalSchemePicker}>
                    {selectedCust.enrolledSchemes.map((s: any, idx: number) => {
                      const isChosen =
                        (selectedScheme?.id && s.id === selectedScheme.id) ||
                        (selectedScheme?.loanName && s.loanName === selectedScheme.loanName);
                      const sName = s.loanName || `Scheme #${idx + 1}`;
                      const sStats = getSchemeStats(selectedCust.id, s.id || sName);

                      return (
                        <TouchableOpacity
                          key={s.id || idx}
                          style={[styles.modalSchemeChip, isChosen && styles.modalSchemeChipActive]}
                          onPress={() => {
                            setSelectedScheme(s);
                            setCollectAmount(s.collectionAmount ? s.collectionAmount.toString() : '');
                          }}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.modalSchemeChipText,
                              isChosen && styles.modalSchemeChipTextActive,
                            ]}
                          >
                            {sName} · ₹{Number(s.collectionAmount || 0).toLocaleString('en-IN')} / cycle
                          </Text>
                          <Text
                            style={[
                              styles.modalSchemeChipSub,
                              isChosen && styles.modalSchemeChipSubActive,
                            ]}
                          >
                            Remaining Balance: ₹{sStats.remainingAmount.toLocaleString('en-IN')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <FormInput
                label="Collection Amount (₹)"
                placeholder="e.g. 1000"
                value={collectAmount}
                onChangeText={setCollectAmount}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Payment Mode</Text>
              <View style={styles.methodContainer}>
                {(['Cash', 'UPI', 'Bank Transfer', 'Card'] as const).map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[styles.methodBtn, paymentMethod === method && styles.methodBtnSelected]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text style={[styles.methodBtnText, paymentMethod === method && styles.methodBtnTextSelected]}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                title="Confirm & Generate Receipt"
                onPress={handleConfirmCollection}
                style={{ marginTop: SPACING.md }}
              />
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
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
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
  },
  addCustomerBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    ...SHADOWS.sm,
  },
  addCustomerBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 12,
  },
  searchContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.xs,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.white,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterScrollContainer: {
    paddingVertical: SPACING.xs + 2,
  },
  filterRow: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: COLORS.white,
  },
  filterChipActiveOverdue: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  filterChipHasOverdue: {
    borderColor: '#F87171',
  },
  filterChipText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    fontSize: 11,
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl * 2,
    backgroundColor: COLORS.background,
    flexGrow: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: SPACING.md,
  },
  cardWrapper: {
    marginBottom: SPACING.sm + 4,
  },
  customerCard: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerNameSection: {
    flex: 1,
    marginRight: SPACING.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 3,
  },
  nameText: {
    ...TYPOGRAPHY.h3,
    fontSize: 16,
    color: COLORS.primary,
  },
  custIdBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  custIdBadgeText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10,
    color: '#2563EB',
    fontFamily: 'monospace',
  },
  memberBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  memberBadgeText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10,
  },
  activeBadge: {
    backgroundColor: '#F0FDF4',
  },
  activeBadgeText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10,
    color: '#16A34A',
  },
  dueTodayBadge: {
    backgroundColor: '#FFFBEB',
  },
  dueTodayBadgeText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10,
    color: '#D97706',
  },
  overdueBadge: {
    backgroundColor: '#FEF2F2',
  },
  overdueBadgeText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10,
    color: '#DC2626',
  },
  settledBadge: {
    backgroundColor: '#F1F5F9',
  },
  settledBadgeText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  phoneText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  scheduleText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 11,
  },
  headerButtonsContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  collectedBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  collectedBtnOverdue: {
    backgroundColor: '#DC2626',
  },
  collectedBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 11,
  },
  settledTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  settledTagText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  viewProfileBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  viewProfileText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs + 2,
  },
  finCol: {
    alignItems: 'flex-start',
  },
  finLabel: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 9,
    color: COLORS.textLight,
  },
  finValue: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
    fontSize: 12,
  },
  paidText: {
    color: COLORS.success,
  },
  remText: {
    color: COLORS.danger,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  progressTrack: {
    flex: 1,
    height: 5,
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
    minWidth: 26,
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  modalSubtitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    marginTop: 2,
  },
  modalCloseText: {
    fontSize: 18,
    color: COLORS.textMuted,
    padding: 4,
  },
  fieldLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  methodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  methodBtn: {
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  methodBtnSelected: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  methodBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
  },
  methodBtnTextSelected: {
    color: COLORS.white,
  },
  errorTextBanner: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    backgroundColor: '#FEF2F2',
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  // Multi-Scheme Card Styles
  multiSchemeCountBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  multiSchemeCountBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#2563EB',
    fontSize: 9,
  },
  settledCountBadge: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  settledCountBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#15803D',
    fontSize: 9,
  },
  multiSchemesList: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
    gap: 6,
  },
  schemeCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    borderRadius: 8,
    padding: SPACING.xs + 3,
  },
  schemeCardLeft: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  schemeCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  schemeNameBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  schemeNameBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#1E40AF',
    fontSize: 10,
  },
  schemeCardSchedule: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  schemeCardNumbers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  schemeCardNum: {
    ...TYPOGRAPHY.caption,
    fontSize: 10.5,
    color: COLORS.textMuted,
  },
  schemeCardRight: {
    alignItems: 'flex-end',
  },
  schemeCollectBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  schemeCollectBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 11,
  },
  schemeSettledBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  schemeSettledBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#15803D',
    fontSize: 10,
  },
  // Modal Scheme Picker
  modalSchemePicker: {
    gap: 6,
    marginBottom: SPACING.xs,
  },
  modalSchemeChip: {
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
  },
  modalSchemeChipActive: {
    borderColor: COLORS.secondary,
    backgroundColor: '#EFF6FF',
  },
  modalSchemeChipText: {
    ...TYPOGRAPHY.bodyMediumBold,
    fontSize: 12,
    color: COLORS.text,
  },
  modalSchemeChipTextActive: {
    color: COLORS.secondary,
  },
  modalSchemeChipSub: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalSchemeChipSubActive: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
});

export default CustomersScreen;
