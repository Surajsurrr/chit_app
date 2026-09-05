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
  Platform,
  Linking,
} from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { Customer } from '../../data/mockData';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import { getPaymentStatusInfo, formatFrequency, PaymentStatusInfo } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const CollectionsScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { customers, schemes, getCustomerStats, recordPayment, selectCustomer, logout } = useChitData();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | 'DUE_TODAY' | 'PAID'>('ALL');
  
  // Record Payment Modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCustId, setSelectedCustId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Card' | 'Bank Transfer'>('UPI');
  const [formError, setFormError] = useState('');

  // Payment Reminder Message Modal states
  const [isMessageModalVisible, setIsMessageModalVisible] = useState(false);
  const [messageCustomer, setMessageCustomer] = useState<Customer | null>(null);
  const [messageStatusInfo, setMessageStatusInfo] = useState<PaymentStatusInfo | null>(null);
  const [messageText, setMessageText] = useState('');

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
      selectCustomer(selectedCustId);
      setIsModalVisible(false);
      // Automatically show the downloadable invoice proof
      navigation.navigate('ReceiptDetail', {
        receiptId: result.receipt.id,
        autoDownload: true,
        isNewPayment: true,
      });
    } else {
      setFormError(result.error || 'Failed to record collection');
    }
  };

  // Automated Reminder Message Generator & Handlers
  const handleOpenMessage = (cust: Customer, info: PaymentStatusInfo) => {
    const scheme = schemes.find((s) => s.id === cust.schemeId);
    const schemeName = scheme ? scheme.name : 'Chit Scheme';
    
    let defaultMsg = '';
    if (info.isOverdue) {
      defaultMsg = `Dear ${cust.name}, this is an urgent reminder from ChitFlow. Your chit installment of ₹${cust.collectionAmount.toLocaleString('en-IN')} for "${schemeName}" is OVERDUE (${info.statusText}). Please settle your payment immediately to avoid account penalties. Thank you!`;
    } else if (info.status === 'DUE_TODAY') {
      defaultMsg = `Dear ${cust.name}, this is a reminder from ChitFlow. Your chit installment of ₹${cust.collectionAmount.toLocaleString('en-IN')} for "${schemeName}" is due TODAY. Kindly pay your due amount. Thank you!`;
    } else {
      defaultMsg = `Dear ${cust.name}, this is a payment notification from ChitFlow. Your upcoming chit installment of ₹${cust.collectionAmount.toLocaleString('en-IN')} for "${schemeName}" is due on ${info.formattedDueDate}. Thank you!`;
    }

    setMessageCustomer(cust);
    setMessageStatusInfo(info);
    setMessageText(defaultMsg);
    setIsMessageModalVisible(true);
  };

  const handleSendViaWhatsApp = async () => {
    if (!messageCustomer) return;
    const cleanPhone = messageCustomer.phone.replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(messageText)}`;

    try {
      await Linking.openURL(url);
      setIsMessageModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Could not open WhatsApp. Please ensure WhatsApp is installed.');
    }
  };

  const handleSendViaSMS = async () => {
    if (!messageCustomer) return;
    const cleanPhone = messageCustomer.phone.replace(/[^0-9]/g, '');
    const url = Platform.OS === 'ios'
      ? `sms:${cleanPhone}&body=${encodeURIComponent(messageText)}`
      : `sms:${cleanPhone}?body=${encodeURIComponent(messageText)}`;

    try {
      await Linking.openURL(url);
      setIsMessageModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Could not open SMS application.');
    }
  };

  const handleSendDirectNotice = () => {
    if (!messageCustomer) return;
    setIsMessageModalVisible(false);
    Alert.alert(
      'Payment Reminder Sent! ✉️',
      `Automated reminder for ₹${messageCustomer.collectionAmount.toLocaleString('en-IN')} has been dispatched to ${messageCustomer.name} (+91 ${messageCustomer.phone}).`,
      [{ text: 'OK' }]
    );
  };

  const handleRemindAllOverdue = () => {
    const overdueList = customerDataWithStatus.filter((i) => i.statusInfo.isOverdue);
    if (overdueList.length === 0) {
      Alert.alert('No Overdue Customers', 'All members are up to date on their scheme payments!');
      return;
    }

    Alert.alert(
      '📢 Broadcast Overdue Reminders',
      `Send automated payment reminder messages to all ${overdueList.length} overdue members (Total pending: ₹${overdueList.reduce((s, i) => s + i.customer.collectionAmount, 0).toLocaleString('en-IN')})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reminders to All',
          style: 'default',
          onPress: () => {
            Alert.alert(
              'Reminders Dispatched! 🚀',
              `Automated payment notices have been successfully sent to all ${overdueList.length} overdue members.`
            );
          },
        },
      ]
    );
  };

  const renderCustomerItem = ({ item }: { item: typeof customerDataWithStatus[0] }) => {
    const { customer, stats, statusInfo } = item;
    const isOverdue = statusInfo.isOverdue;

    return (
      <Card
        style={styles.collectionCard}
        padding={SPACING.md}
      >
        {/* Overdue alert banner */}
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
          <View style={styles.nameSection}>
            <View style={styles.nameBadgeRow}>
              <Text style={styles.nameText}>
                {customer.name}
              </Text>
              <StatusBadge status={statusInfo.badgeLabel} />
            </View>
            <Text style={styles.frequencyText}>
              Installment: ₹{customer.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(customer.frequency)}
            </Text>
            <Text style={[styles.dueInfoText, isOverdue && styles.overdueDueInfoText]}>
              Due Date: {statusInfo.formattedDueDate} {isOverdue ? `(${statusInfo.statusText})` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <View>
            <Text style={styles.label}>OUTSTANDING</Text>
            <Text style={[styles.amountText, isOverdue && styles.overdueAmountText]}>
              ₹{stats.remainingAmount.toLocaleString('en-IN')}
            </Text>
          </View>

          {statusInfo.status !== 'PAID' ? (
            <View style={styles.actionsRow}>
              {/* Message Reminder Button */}
              <TouchableOpacity
                style={styles.messageBtn}
                onPress={() => handleOpenMessage(customer, statusInfo)}
                activeOpacity={0.7}
              >
                <Text style={styles.messageBtnText}>
                  💬 Message
                </Text>
              </TouchableOpacity>

              {/* Record Payment Button */}
              <TouchableOpacity
                style={[styles.collectBtn, isOverdue && styles.overdueCollectBtn]}
                onPress={() => handleOpenCollect(customer.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.collectBtnText}>
                  {isOverdue ? 'Collect ⚠️' : 'Record'}
                </Text>
              </TouchableOpacity>
            </View>
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
          <Text style={styles.headerSubtitle}>Monitor schedules, message & collect</Text>
        </View>
        <TouchableOpacity style={styles.roleBtn} onPress={() => logout()}>
          <Text style={styles.roleBtnText}>Log Out</Text>
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

        {/* Filter Chips & Broadcast */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
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

            {overdueCount > 0 && (
              <TouchableOpacity
                style={styles.broadcastBtn}
                onPress={handleRemindAllOverdue}
                activeOpacity={0.8}
              >
                <Text style={styles.broadcastBtnText}>📢 Remind All Overdue</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No matching customer collections found.</Text>
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

      {/* Send Payment Reminder Message Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isMessageModalVisible}
        onRequestClose={() => setIsMessageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.messageModalTitleRow}>
                <View style={styles.messageIconBadge}>
                  <Text style={{ fontSize: 16 }}>💬</Text>
                </View>
                <Text style={styles.modalTitle}>Send Payment Reminder</Text>
              </View>
              <TouchableOpacity onPress={() => setIsMessageModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {messageCustomer && messageStatusInfo && (
              <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                {/* Customer summary card */}
                <View style={[styles.messageCustCard, messageStatusInfo.isOverdue && styles.messageCustCardOverdue]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.messageCustName}>{messageCustomer.name}</Text>
                    <Text style={styles.messageCustPhone}>📱 +91 {messageCustomer.phone}</Text>
                    <Text style={styles.messageCustDue}>
                      Installment Due: <Text style={styles.boldRed}>₹{messageCustomer.collectionAmount.toLocaleString('en-IN')}</Text>
                    </Text>
                  </View>
                  <StatusBadge status={messageStatusInfo.badgeLabel} />
                </View>

                <Text style={styles.messageBoxLabel}>AUTOMATIC REMINDER MESSAGE</Text>
                <TextInput
                  style={styles.messageTextInput}
                  multiline={true}
                  numberOfLines={4}
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder="Type reminder message..."
                  placeholderTextColor={COLORS.textLight}
                />

                <Text style={styles.channelLabel}>Choose Messaging App / Delivery</Text>

                {/* WhatsApp Button */}
                <TouchableOpacity
                  style={styles.whatsAppBtn}
                  onPress={handleSendViaWhatsApp}
                  activeOpacity={0.85}
                >
                  <Text style={styles.whatsAppBtnIcon}>💬</Text>
                  <Text style={styles.whatsAppBtnText}>Send via WhatsApp</Text>
                </TouchableOpacity>

                {/* SMS Button */}
                <TouchableOpacity
                  style={styles.smsBtn}
                  onPress={handleSendViaSMS}
                  activeOpacity={0.85}
                >
                  <Text style={styles.smsBtnIcon}>📱</Text>
                  <Text style={styles.smsBtnText}>Send via SMS Text</Text>
                </TouchableOpacity>

                {/* Direct in-app notice Button */}
                <TouchableOpacity
                  style={styles.directNoticeBtn}
                  onPress={handleSendDirectNotice}
                  activeOpacity={0.85}
                >
                  <Text style={styles.directNoticeBtnText}>⚡ Send In-App Notice</Text>
                </TouchableOpacity>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
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
  broadcastBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: SPACING.xs,
  },
  broadcastBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 11,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 110,
  },
  collectionCard: {
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  overdueCollectionCard: {
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
  nameSection: {
    flex: 1,
  },
  nameBadgeRow: {
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
  frequencyText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  dueInfoText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  overdueDueInfoText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    fontSize: 9,
  },
  amountText: {
    ...TYPOGRAPHY.amountMedium,
    color: COLORS.text,
    marginTop: 2,
  },
  overdueAmountText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  messageBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.sm,
  },
  overdueMessageBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  messageBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: '#2563EB',
    fontSize: 12,
  },
  overdueMessageBtnText: {
    color: '#DC2626',
  },
  collectBtn: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  overdueCollectBtn: {
    backgroundColor: '#DC2626',
  },
  collectBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
    fontSize: 13,
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
    maxHeight: '88%',
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
  // Message Reminder Modal Styles
  messageModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  messageCustCard: {
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
  messageCustCardOverdue: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FCA5A5',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  messageCustName: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  messageCustPhone: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  messageCustDue: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    marginTop: 4,
  },
  boldRed: {
    color: '#DC2626',
    fontWeight: '700',
  },
  messageBoxLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
    letterSpacing: 0.5,
    fontSize: 10,
  },
  messageTextInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.text,
    textAlignVertical: 'top',
    minHeight: 90,
    marginBottom: SPACING.lg,
  },
  channelLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    fontSize: 12,
  },
  whatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  whatsAppBtnIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  whatsAppBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
    fontSize: 15,
  },
  smsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  smsBtnIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  smsBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
    fontSize: 15,
  },
  directNoticeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.xl,
  },
  directNoticeBtnText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.white,
    fontSize: 14,
  },
});

export default CollectionsScreen;
