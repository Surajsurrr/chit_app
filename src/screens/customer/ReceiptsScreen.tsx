import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import Card from '../../components/Card';
import { formatDateShort } from '../../utils/dateHelpers';
import { downloadReceiptPdf, downloadAllReceiptsPdf } from '../../utils/receiptGenerator';
import { Receipt } from '../../data/mockData';
import { StatusBar } from 'expo-status-bar';

export const ReceiptsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    selectedCustomerId,
    customers,
    schemes,
    payments,
    receipts,
    currentUserRole,
    logout,
  } = useChitData();

  const isAdmin = currentUserRole === 'admin';

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [adminCustomerFilter, setAdminCustomerFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');

  // Loading states
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);

  const activeCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Guarantee that every single payment has a corresponding receipt in our list
  const allReconciledReceipts = useMemo(() => {
    const receiptMap = new Map<string, Receipt>();
    receipts.forEach((r) => {
      receiptMap.set(r.id, r);
      if (r.paymentId) receiptMap.set(r.paymentId, r);
    });

    const combined = [...receipts];

    payments.forEach((p) => {
      if (!receiptMap.has(p.receiptId) && !receiptMap.has(p.id)) {
        const cust = customers.find((c) => c.id === p.customerId);
        const sch = schemes.find((s) => s.id === cust?.schemeId);
        const pDate = new Date(p.date);
        const year = isNaN(pDate.getFullYear()) ? '2026' : pDate.getFullYear().toString();
        const month = isNaN(pDate.getMonth()) ? '08' : (pDate.getMonth() + 1).toString().padStart(2, '0');
        const suffix = p.id.replace(/[^0-9]/g, '').slice(-4).padStart(4, '0') || '1001';

        const synthesizedReceipt: Receipt = {
          id: p.receiptId || `rec-${p.id}`,
          paymentId: p.id,
          receiptNumber: `REC-${year}${month}-${suffix}`,
          customerId: p.customerId,
          customerName: p.customerName || cust?.name || 'Customer',
          date: p.date,
          amount: p.amount,
          method: `${p.method} payment`,
          schemeName: p.schemeName || sch?.name || 'Chit Scheme',
          remainingBalance: Math.max(0, (cust?.amountGiven || 50000) - p.amount),
          referenceId: `REF${p.id.replace(/[^0-9]/g, '').slice(-9).padStart(9, '9')}`,
        };

        combined.push(synthesizedReceipt);
        receiptMap.set(synthesizedReceipt.id, synthesizedReceipt);
        receiptMap.set(p.id, synthesizedReceipt);
      }
    });

    return combined;
  }, [receipts, payments, customers, schemes]);

  // Determine base receipts based on role & customer selection
  const baseReceipts = useMemo(() => {
    if (isAdmin) {
      if (adminCustomerFilter === 'ALL') {
        return allReconciledReceipts;
      }
      return allReconciledReceipts.filter((r) => r.customerId === adminCustomerFilter);
    } else {
      return allReconciledReceipts.filter((r) => r.customerId === selectedCustomerId);
    }
  }, [isAdmin, adminCustomerFilter, allReconciledReceipts, selectedCustomerId]);

  // Apply search query, method filter, and sorting
  const filteredReceipts = useMemo(() => {
    return baseReceipts
      .filter((r) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          r.receiptNumber.toLowerCase().includes(query) ||
          r.customerName.toLowerCase().includes(query) ||
          r.amount.toString().includes(query) ||
          r.method.toLowerCase().includes(query) ||
          r.schemeName.toLowerCase().includes(query) ||
          r.referenceId.toLowerCase().includes(query);

        const matchesMethod =
          methodFilter === 'ALL' ||
          r.method.toLowerCase().includes(methodFilter.toLowerCase());

        return matchesSearch && matchesMethod;
      })
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
      });
  }, [baseReceipts, searchQuery, methodFilter, sortOrder]);

  // Total metrics for filtered receipts
  const totalAmount = useMemo(() => {
    return filteredReceipts.reduce((sum, r) => sum + r.amount, 0);
  }, [filteredReceipts]);

  // Handle single receipt download
  const handleDownloadSingleReceipt = async (receipt: Receipt) => {
    setDownloadingId(receipt.id);
    try {
      const cust = customers.find((c) => c.id === receipt.customerId);
      const sch = schemes.find(
        (s) => s.id === cust?.schemeId || s.name === receipt.schemeName
      );
      await downloadReceiptPdf(receipt, cust, sch);
    } catch (e: any) {
      Alert.alert('Download Error', e?.message || 'Failed to download receipt');
    } finally {
      setDownloadingId(null);
    }
  };

  // Handle batch download (All Receipts statement)
  const handleDownloadAllReceipts = async () => {
    if (filteredReceipts.length === 0) {
      Alert.alert('No Receipts', 'There are no receipts in the current view to download.');
      return;
    }

    setIsExportingAll(true);
    try {
      const cust = isAdmin && adminCustomerFilter !== 'ALL'
        ? customers.find((c) => c.id === adminCustomerFilter)
        : activeCustomer;
      const sch = schemes.find((s) => s.id === cust?.schemeId);

      await downloadAllReceiptsPdf(filteredReceipts, cust, sch);
    } catch (e: any) {
      Alert.alert('Export Error', e?.message || 'Failed to export statement');
    } finally {
      setIsExportingAll(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const renderReceiptItem = ({ item }: { item: Receipt }) => {
    const isDownloadingThis = downloadingId === item.id;

    return (
      <Card style={styles.receiptCard} padding={SPACING.md}>
        {/* Top meta row */}
        <View style={styles.topRow}>
          <View style={styles.receiptNumberBox}>
            <Text style={styles.receiptPrefix}>#</Text>
            <Text style={styles.receiptNum}>{item.receiptNumber}</Text>
          </View>
          <View style={styles.dateTagBox}>
            <Text style={styles.dateText}>{formatDateShort(item.date)}</Text>
            <View style={styles.statusDot} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>

        {/* Middle details row */}
        <View style={styles.middleRow}>
          <View style={styles.infoLeft}>
            {isAdmin && (
              <Text style={styles.custNameText}>{item.customerName}</Text>
            )}
            <Text style={styles.schemeNameText}>{item.schemeName}</Text>
            <View style={styles.methodBadge}>
              <Text style={styles.methodBadgeText}>{item.method}</Text>
              <Text style={styles.refIdText}>· {item.referenceId}</Text>
            </View>
          </View>

          <View style={styles.infoRight}>
            <Text style={styles.amountLabel}>PAID AMOUNT</Text>
            <Text style={styles.amountText}>₹{item.amount.toLocaleString('en-IN')}</Text>
            <Text style={styles.balanceText}>
              Bal: ₹{item.remainingBalance.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Bottom Actions Row */}
        <View style={styles.actionsRow}>
          {/* Download PDF Button — strictly for customers alone */}
          {!isAdmin && (
            <TouchableOpacity
              style={[styles.downloadBtn, isDownloadingThis && styles.downloadBtnActive]}
              onPress={() => handleDownloadSingleReceipt(item)}
              disabled={isDownloadingThis}
              activeOpacity={0.8}
            >
              {isDownloadingThis ? (
                <View style={styles.btnInnerRow}>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={styles.downloadBtnText}>Generating PDF...</Text>
                </View>
              ) : (
                <View style={styles.btnInnerRow}>
                  <Text style={styles.downloadBtnIcon}>📥</Text>
                  <Text style={styles.downloadBtnText}>Download Receipt (PDF)</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* View Details Button */}
          <TouchableOpacity
            style={[styles.viewDetailBtn, isAdmin && { flex: 1, alignItems: 'center' }]}
            onPress={() => navigation.navigate('ReceiptDetail', { receiptId: item.id })}
            activeOpacity={0.7}
          >
            <Text style={styles.viewDetailBtnText}>View Details →</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>
            {isAdmin ? 'Collections & Receipts' : 'My Receipts'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isAdmin
              ? 'Official verified customer payment receipts register'
              : 'All payment receipts recorded for your chit scheme'}
          </Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Summary Metric & Batch Download Header */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryLeft}>
            <Text style={styles.summaryCountLabel}>TOTAL RECEIPTS</Text>
            <Text style={styles.summaryCountVal}>{filteredReceipts.length} Payments</Text>
            <Text style={styles.summaryAmountVal}>
              ₹{totalAmount.toLocaleString('en-IN')} Total Collected
            </Text>
          </View>

          {!isAdmin && (
            <TouchableOpacity
              style={[styles.exportAllBtn, isExportingAll && styles.exportAllBtnDisabled]}
              onPress={handleDownloadAllReceipts}
              disabled={isExportingAll}
              activeOpacity={0.85}
            >
              {isExportingAll ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.exportAllIcon}>📥</Text>
                  <Text style={styles.exportAllText}>Download All (PDF)</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={
              isAdmin
                ? 'Search receipt #, member name, amount, or scheme...'
                : 'Search receipt #, amount, or payment method...'
            }
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Admin Customer Filter Chips */}
        {isAdmin && (
          <View style={styles.adminFilterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <TouchableOpacity
                style={[
                  styles.adminFilterChip,
                  adminCustomerFilter === 'ALL' && styles.adminFilterChipActive,
                ]}
                onPress={() => setAdminCustomerFilter('ALL')}
              >
                <Text
                  style={[
                    styles.adminFilterChipText,
                    adminCustomerFilter === 'ALL' && styles.adminFilterChipTextActive,
                  ]}
                >
                  All Members ({allReconciledReceipts.length})
                </Text>
              </TouchableOpacity>

              {customers.map((c) => {
                const count = allReconciledReceipts.filter((r) => r.customerId === c.id).length;
                const isSelected = adminCustomerFilter === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.adminFilterChip, isSelected && styles.adminFilterChipActive]}
                    onPress={() => setAdminCustomerFilter(c.id)}
                  >
                    <Text
                      style={[
                        styles.adminFilterChipText,
                        isSelected && styles.adminFilterChipTextActive,
                      ]}
                    >
                      {c.name} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Quick Method and Sort Filter Bar */}
        <View style={styles.quickFilterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {(['ALL', 'UPI', 'Cash', 'Bank Transfer'] as const).map((m) => {
              const isSelected = methodFilter === m;
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodChip, isSelected && styles.methodChipActive]}
                  onPress={() => setMethodFilter(m)}
                >
                  <Text style={[styles.methodChipText, isSelected && styles.methodChipTextActive]}>
                    {m === 'ALL' ? 'All Channels' : m}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.sortToggleBtn}
              onPress={() => setSortOrder((prev) => (prev === 'NEWEST' ? 'OLDEST' : 'NEWEST'))}
            >
              <Text style={styles.sortToggleText}>
                {sortOrder === 'NEWEST' ? '↓ Newest First' : '↑ Oldest First'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Receipts List */}
        {filteredReceipts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyTitle}>No Receipts Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'No payment receipts match your search terms.'
                : 'No payment transactions recorded for this selection.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredReceipts}
            renderItem={renderReceiptItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
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
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    marginLeft: SPACING.sm,
  },
  logoutBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: '#FCA5A5',
    fontSize: 12,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  summaryBar: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryLeft: {
    flex: 1,
  },
  summaryCountLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  summaryCountVal: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 1,
  },
  summaryAmountVal: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.success,
    fontSize: 11,
    marginTop: 1,
  },
  exportAllBtn: {
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: 10,
    elevation: 2,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  exportAllBtnDisabled: {
    opacity: 0.7,
  },
  exportAllIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  exportAllText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 12,
  },
  searchContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    height: 42,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    fontSize: 13,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearSearchBtn: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  clearSearchText: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: 'bold',
  },
  adminFilterRow: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  quickFilterBar: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  adminFilterChip: {
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  adminFilterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  adminFilterChipText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  adminFilterChipTextActive: {
    color: COLORS.white,
  },
  methodChip: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  methodChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: COLORS.success,
  },
  methodChipText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  methodChipTextActive: {
    color: COLORS.success,
  },
  sortToggleBtn: {
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginLeft: SPACING.xs,
  },
  sortToggleText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: '#2563EB',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 110,
  },
  receiptCard: {
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  receiptNumberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: 8,
  },
  receiptPrefix: {
    ...TYPOGRAPHY.captionBold,
    color: '#0284C7',
    marginRight: 2,
  },
  receiptNum: {
    ...TYPOGRAPHY.captionBold,
    fontFamily: 'monospace',
    color: '#0369A1',
    fontSize: 11,
  },
  dateTagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.success,
  },
  verifiedText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.success,
    fontSize: 10,
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  infoLeft: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  custNameText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
    marginBottom: 2,
  },
  schemeNameText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primaryLight,
    fontSize: 12,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  methodBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  refIdText: {
    ...TYPOGRAPHY.caption,
    fontFamily: 'monospace',
    color: COLORS.textLight,
    fontSize: 10,
    marginLeft: 4,
  },
  infoRight: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    fontSize: 8,
    letterSpacing: 0.5,
  },
  amountText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.success,
    fontWeight: '800',
    marginTop: 1,
  },
  balanceText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  downloadBtn: {
    backgroundColor: '#10B981',
    flex: 1,
    paddingVertical: SPACING.sm + 1,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtnActive: {
    backgroundColor: '#059669',
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtnIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  downloadBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 12,
  },
  viewDetailBtn: {
    paddingVertical: SPACING.sm + 1,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  viewDetailBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
});

export default ReceiptsScreen;
