import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import { getStatusLabel } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const CollectionsScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { customers, getCustomerStats, recordPayment } = useChitData();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCustId, setSelectedCustId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Card' | 'Bank Transfer'>('UPI');
  const [formError, setFormError] = useState('');

  // Handle optional route parameters to pre-open collection for a specific customer
  useEffect(() => {
    if (route.params?.customerId) {
      const customerId = route.params.customerId;
      const customer = customers.find((c) => c.id === customerId);
      if (customer) {
        setSearchQuery(customer.name);
        handleOpenCollect(customerId);
      }
      // Clear route params after consumption
      navigation.setParams({ customerId: undefined });
    }
  }, [route.params?.customerId]);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const handleOpenCollect = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustId(customerId);
      setPaymentAmount(customer.collectionAmount.toString());
      setPaymentMethod('UPI');
      setFormError('');
      setIsModalVisible(true);
    }
  };

  const handleRecordCollection = () => {
    if (!selectedCustId) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setFormError('Please enter a valid amount');
      return;
    }

    const result = recordPayment(selectedCustId, amount, paymentMethod);
    
    if (result.success && result.receipt) {
      setIsModalVisible(false);
      // Navigate to the newly generated receipt
      navigation.navigate('ReceiptDetail', { receiptId: result.receipt.id });
    } else {
      setFormError(result.error || 'Failed to record collection');
    }
  };

  const renderCustomerItem = ({ item }: { item: typeof customers[0] }) => {
    const stats = getCustomerStats(item.id);
    const status = getStatusLabel(item.nextPaymentDate, stats.remainingAmount);

    return (
      <Card style={styles.collectionCard} padding={SPACING.md}>
        <View style={styles.cardHeader}>
          <View style={styles.nameSection}>
            <Text style={styles.nameText}>{item.name}</Text>
            <Text style={styles.frequencyText}>
              ₹{item.collectionAmount.toLocaleString('en-IN')} · Every {item.frequency.replace(/every_/g, '').replace(/_/g, ' ')}
            </Text>
          </View>
          <StatusBadge status={status} />
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <View>
            <Text style={styles.label}>OUTSTANDING</Text>
            <Text style={styles.amountText}>₹{stats.remainingAmount.toLocaleString('en-IN')}</Text>
          </View>

          {status !== 'PAID' ? (
            <TouchableOpacity
              style={styles.collectBtn}
              onPress={() => handleOpenCollect(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.collectBtnText}>Record Payment</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>Fully Settled</Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustId);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Collections</Text>
          <Text style={styles.headerSubtitle}>Monitor schedules and record payments</Text>
        </View>
        <TouchableOpacity style={styles.roleBtn} onPress={() => navigation.navigate('RoleSelection')}>
          <Text style={styles.roleBtnText}>Switch Role</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search customer by name or phone..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No matching customer collections found.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredCustomers}
            renderItem={renderCustomerItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Record Collection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Collection</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedCustomer && (
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalCustName}>{selectedCustomer.name}</Text>
                <Text style={styles.modalCustPhone}>+91 {selectedCustomer.phone}</Text>
                
                <View style={styles.modalStatsCard}>
                  <Text style={styles.statsLabel}>REMAINING BALANCE</Text>
                  <Text style={styles.statsValue}>
                    ₹{getCustomerStats(selectedCustomer.id).remainingAmount.toLocaleString('en-IN')}
                  </Text>
                </View>

                {formError ? <Text style={styles.modalError}>{formError}</Text> : null}

                <FormInput
                  label="Collection Amount (₹)"
                  placeholder="e.g. 1000"
                  value={paymentAmount}
                  onChangeText={(val) => {
                    setPaymentAmount(val);
                    setFormError('');
                  }}
                  keyboardType="numeric"
                />

                <Text style={styles.modalLabel}>Payment Method</Text>
                <View style={styles.methodGrid}>
                  {(['UPI', 'Cash', 'Bank Transfer', 'Card'] as const).map((method) => {
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

                <Button
                  title="Confirm Collection"
                  onPress={handleRecordCollection}
                  style={styles.modalSubmitBtn}
                  size="large"
                  variant="success"
                />
              </ScrollView>
            )}
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
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInput: {
    height: 48,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listContent: {
    padding: SPACING.md,
  },
  collectionCard: {
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameSection: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  nameText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  frequencyText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    fontSize: 8,
  },
  amountText: {
    ...TYPOGRAPHY.amountMedium,
    color: COLORS.danger,
    marginTop: 2,
  },
  collectBtn: {
    backgroundColor: COLORS.success,
    borderRadius: 10,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  collectBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
  },
  completedBadge: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  completedText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.success,
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
    maxHeight: '85%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  closeBtn: {
    padding: SPACING.xs,
  },
  closeBtnText: {
    fontSize: 18,
    color: COLORS.textMuted,
    fontWeight: 'bold',
  },
  modalScroll: {
    padding: SPACING.lg,
  },
  modalCustName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary,
  },
  modalCustPhone: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: SPACING.md,
  },
  modalStatsCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statsLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
  },
  statsValue: {
    ...TYPOGRAPHY.amountMedium,
    color: COLORS.danger,
    marginTop: 4,
  },
  modalError: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.danger,
    marginBottom: SPACING.md,
  },
  modalLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primaryLight,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
    marginBottom: SPACING.xl,
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
    width: '46%', // 2 per row roughly
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
  modalSubmitBtn: {
    marginBottom: SPACING.xl,
  },
});

export default CollectionsScreen;
