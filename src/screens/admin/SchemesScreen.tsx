import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Card from '../../components/Card';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import { formatFrequency } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';
import { Scheme } from '../../data/mockData';

export const SchemesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { schemes, customers, addScheme, updateScheme, deleteScheme, logout, isAdminProfileComplete } = useChitData();

  // Create / Edit Scheme states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [collectionAmount, setCollectionAmount] = useState('');
  const [interestAmount, setInterestAmount] = useState('');
  const [duration, setDuration] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'every_3_days' | 'weekly' | 'monthly'>('daily');
  const [formError, setFormError] = useState('');

  const getCustomerCount = (schemeId: string): number => {
    const targetScheme = schemes.find((s) => s.id === schemeId);
    const targetName = targetScheme?.name || '';
    return customers.filter((c) => {
      const enrolled = Array.isArray(c.enrolledSchemes) ? c.enrolledSchemes : [];
      return (
        c.schemeId === schemeId ||
        (targetName && c.schemeId === targetName) ||
        (c.enrolledSchemeIds && c.enrolledSchemeIds.includes(schemeId)) ||
        enrolled.some(
          (s: any) =>
            s.id === schemeId ||
            s.schemeId === schemeId ||
            (targetName && s.loanName === targetName) ||
            (targetName && s.schemeName === targetName)
        )
      );
    }).length;
  };

  const handleDeleteScheme = (scheme: Scheme) => {
    const count = getCustomerCount(scheme.id);
    const countText = count > 0 ? `\n\n⚠️ ${count} customer(s) are currently enrolled in this scheme.` : '';

    Alert.alert(
      `Delete "${scheme.name}"?`,
      `Are you sure you want to delete this scheme? It will be removed for both admin and customer portals.${countText}\n\nNote: If this is a customer's only scheme, their entire customer profile will also be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Scheme',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteScheme(scheme.id);
            if (res.success) {
              let info = `Scheme "${scheme.name}" has been deleted successfully.`;
              if (res.deletedCustomersCount && res.deletedCustomersCount > 0) {
                info += `\n\n${res.deletedCustomersCount} customer profile(s) with no remaining schemes were also closed.`;
              }
              if (res.affectedCustomersCount && res.affectedCustomersCount > (res.deletedCustomersCount || 0)) {
                info += `\n\n${res.affectedCustomersCount - (res.deletedCustomersCount || 0)} multi-scheme customer(s) had this scheme removed from their active profiles.`;
              }
              Alert.alert('Scheme Deleted ✓', info);
            } else {
              Alert.alert('Error', res.error || 'Failed to delete scheme');
            }
          },
        },
      ]
    );
  };

  const handleOpenCreateModal = () => {
    setEditingSchemeId(null);
    setName('');
    setTotalAmount('');
    setCollectionAmount('');
    setInterestAmount('');
    setDuration('');
    setFrequency('daily');
    setFormError('');
    setIsModalVisible(true);
  };

  const handleOpenEditModal = (scheme: Scheme) => {
    setEditingSchemeId(scheme.id);
    setName(scheme.name);
    setTotalAmount(scheme.totalAmount.toString());
    setCollectionAmount(scheme.collectionAmount.toString());
    setInterestAmount(scheme.interestAmount ? scheme.interestAmount.toString() : '0');
    setDuration(scheme.durationWeeksOrMonths.toString());
    setFrequency(scheme.frequency);
    setFormError('');
    setIsModalVisible(true);
  };

  // Handlers with smart sync
  const handleTotalAmountChange = (val: string) => {
    setTotalAmount(val);
    setFormError('');
    const t = parseFloat(val) || 0;
    const c = parseFloat(collectionAmount) || 0;
    if (t > 0 && c > 0) {
      setDuration(Math.round(t / c).toString());
    }
  };

  const handleCollectionAmountChange = (val: string) => {
    setCollectionAmount(val);
    setFormError('');
    const c = parseFloat(val) || 0;
    const t = parseFloat(totalAmount) || 0;
    if (t > 0 && c > 0) {
      setDuration(Math.round(t / c).toString());
    }
  };

  const handleDurationChange = (val: string) => {
    setDuration(val);
    setFormError('');
    const d = parseInt(val, 10) || 0;
    const t = parseFloat(totalAmount) || 0;
    if (t > 0 && d > 0) {
      setCollectionAmount(Math.round(t / d).toString());
    }
  };

  const handleSaveScheme = () => {
    if (!name.trim() || !totalAmount || !collectionAmount || !duration) {
      setFormError('All required fields must be filled');
      return;
    }

    const total = parseFloat(totalAmount);
    const collection = parseFloat(collectionAmount);
    const parsedInterest = interestAmount ? parseFloat(interestAmount) : 0;
    const dur = parseInt(duration, 10);
    const payout = Math.max(0, total - parsedInterest);
    const totalCollected = dur * collection;

    if (isNaN(total) || total <= 0) {
      setFormError('Total amount must be greater than 0');
      return;
    }
    if (isNaN(collection) || collection <= 0) {
      setFormError('Collection amount must be greater than 0');
      return;
    }
    if (collection > total) {
      setFormError('Collection amount cannot exceed total amount');
      return;
    }
    if (isNaN(parsedInterest) || parsedInterest < 0) {
      setFormError('Interest amount must be 0 or a positive number');
      return;
    }
    if (parsedInterest >= total) {
      setFormError('Interest deduction cannot be greater than or equal to total scheme value');
      return;
    }
    if (isNaN(dur) || dur <= 0) {
      setFormError('Duration must be a positive number');
      return;
    }

    // Strict validation: Total collected money from all installments MUST equal total scheme value
    if (totalCollected !== total) {
      setFormError(
        `Total collected money (${dur} installments × ₹${collection.toLocaleString('en-IN')} = ₹${totalCollected.toLocaleString('en-IN')}) must be exactly equal to the Total Scheme Value (₹${total.toLocaleString('en-IN')}).`
      );
      return;
    }

    const freqStr = frequency === 'every_3_days' ? 'every 3 days' : frequency;
    const autoDesc = `Total Chit Value is ₹${total.toLocaleString('en-IN')}. An upfront interest of ₹${parsedInterest.toLocaleString('en-IN')} is deducted, giving the customer a net payout of ₹${payout.toLocaleString('en-IN')}. The customer repays ₹${total.toLocaleString('en-IN')} across ${dur} installments of ₹${collection.toLocaleString('en-IN')} (${freqStr}).`;

    if (editingSchemeId) {
      // Update existing scheme
      updateScheme(editingSchemeId, {
        name: name.trim(),
        totalAmount: total,
        collectionAmount: collection,
        interestAmount: parsedInterest,
        payoutAmount: payout,
        frequency,
        durationWeeksOrMonths: dur,
        description: autoDesc,
      });
    } else {
      // Add new scheme
      addScheme({
        name: name.trim(),
        totalAmount: total,
        collectionAmount: collection,
        interestAmount: parsedInterest,
        payoutAmount: payout,
        frequency,
        durationWeeksOrMonths: dur,
        description: autoDesc,
      });
    }

    // Reset and close
    setEditingSchemeId(null);
    setName('');
    setTotalAmount('');
    setCollectionAmount('');
    setInterestAmount('');
    setDuration('');
    setFrequency('daily');
    setFormError('');
    setIsModalVisible(false);
  };

  // Live modal calculations
  const parsedLiveTotal = parseFloat(totalAmount) || 0;
  const parsedLiveInterest = parseFloat(interestAmount) || 0;
  const parsedLivePayout = Math.max(0, parsedLiveTotal - parsedLiveInterest);
  const parsedLiveCollection = parseFloat(collectionAmount) || 0;
  const parsedLiveDuration = parseInt(duration, 10) || 0;
  const liveTotalCollected = parsedLiveDuration * parsedLiveCollection;
  const isRepaymentMatching = parsedLiveTotal > 0 && liveTotalCollected === parsedLiveTotal;

  const renderSchemeItem = ({ item }: { item: Scheme }) => {
    const memberCount = getCustomerCount(item.id);
    const interest = item.interestAmount || 0;
    const payout = item.payoutAmount || Math.max(0, item.totalAmount - interest);
    const totalCollected = item.durationWeeksOrMonths * item.collectionAmount;

    return (
      <Card style={styles.schemeCard} padding={SPACING.md}>
        <View style={styles.cardHeader}>
          <View style={styles.schemeTitleBlock}>
            <Text style={styles.schemeName}>{item.name}</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active Plan</Text>
            </View>
          </View>

          <View style={styles.cardHeaderRight}>
            <View style={styles.memberBadge}>
              <Text style={styles.memberBadgeText}>{memberCount} {memberCount === 1 ? 'member' : 'members'}</Text>
            </View>
            <View style={styles.headerBtnRow}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => handleOpenEditModal(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.editBtnText}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteScheme(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Payout & Interest Highlights */}
        <View style={styles.payoutHighlightRow}>
          <View style={styles.payoutCol}>
            <Text style={styles.payoutLabel}>TOTAL VALUE</Text>
            <Text style={styles.payoutValue}>₹{item.totalAmount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.payoutCol}>
            <Text style={styles.payoutLabel}>INTEREST DEDUCTED</Text>
            <Text style={styles.interestValue}>- ₹{interest.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.payoutColMain}>
            <Text style={styles.netPayoutLabel}>NET CUSTOMER PAYOUT</Text>
            <Text style={styles.netPayoutValue}>₹{payout.toLocaleString('en-IN')}</Text>
            <Text style={styles.netPayoutSubtitle}>Given upfront</Text>
          </View>
        </View>

        {/* Installments vs Total Collected Equality Badge */}
        <View style={styles.repaymentSummaryBar}>
          <Text style={styles.repaymentFormulaText}>
            🔄 Collection Plan: <Text style={styles.boldText}>{item.durationWeeksOrMonths} × ₹{item.collectionAmount.toLocaleString('en-IN')}</Text> = <Text style={styles.boldGreenText}>₹{totalCollected.toLocaleString('en-IN')}</Text>
          </Text>
          <View style={styles.exactMatchBadge}>
            <Text style={styles.exactMatchBadgeText}>✓ 100% Repaid</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.gridCell}>
            <Text style={styles.detailLabel}>INSTALLMENT</Text>
            <Text style={styles.detailValue}>₹{item.collectionAmount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.detailLabel}>FREQUENCY</Text>
            <Text style={[styles.detailValue, styles.capitalize]}>{formatFrequency(item.frequency)}</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.detailLabel}>DURATION</Text>
            <Text style={styles.detailValue}>{item.durationWeeksOrMonths} collections</Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Chit Schemes</Text>
          <Text style={styles.headerSubtitle}>Manage payouts, interest & rules</Text>
        </View>
        <View style={styles.headerRightRow}>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => navigation.navigate('AdminProfile')}
            activeOpacity={0.85}
          >
            <Text style={styles.profileBtnText}>👤 Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.roleBtn} onPress={() => logout()} activeOpacity={0.8}>
            <Text style={styles.roleBtnText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Mandatory Admin Profile Alert Banner */}
        {!isAdminProfileComplete && (
          <TouchableOpacity
            style={styles.profileWarningBanner}
            onPress={() => navigation.navigate('AdminProfile')}
            activeOpacity={0.9}
          >
            <Text style={styles.profileWarningIcon}>🔒</Text>
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={styles.profileWarningTitle}>Schemes Hidden from Customers</Text>
              <Text style={styles.profileWarningText}>
                Customers cannot view or avail any chit schemes until your organizer profile is set up. Tap here to complete your profile.
              </Text>
            </View>
            <Text style={styles.profileWarningAction}>Setup →</Text>
          </TouchableOpacity>
        )}

        {/* Scheme Policy Notice Banner */}
        <View style={styles.policyNoticeBanner}>
          <Text style={styles.policyNoticeIcon}>ℹ️</Text>
          <Text style={styles.policyNoticeText}>
            Scheme terms agreed upon by enrolled members last permanently. Changes made here apply to all future member enrollments.
          </Text>
        </View>

        {schemes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No schemes available.</Text>
          </View>
        ) : (
          <FlatList
            data={schemes}
            renderItem={renderSchemeItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Floating button to create scheme */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleOpenCreateModal}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Create / Edit Scheme Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSchemeId ? 'Edit Chit Scheme' : 'Create Chit Scheme'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {editingSchemeId && (
                <View style={styles.modalEditNoticeBox}>
                  <Text style={styles.modalEditNoticeText}>
                    📌 Edits apply to future member enrollments. Existing enrolled customers will permanently keep their agreed contract terms.
                  </Text>
                </View>
              )}

              {formError ? <Text style={styles.modalError}>{formError}</Text> : null}

              {/* Dynamic Live Calculation Card */}
              {parsedLiveTotal > 0 && (
                <View style={styles.liveCalcCard}>
                  <Text style={styles.liveCalcTitle}>📊 SCHEME FINANCIAL SUMMARY</Text>
                  <View style={styles.liveCalcRow}>
                    <Text style={styles.liveCalcLabel}>Total Scheme Value:</Text>
                    <Text style={styles.liveCalcValue}>₹{parsedLiveTotal.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.liveCalcRow}>
                    <Text style={styles.liveCalcLabel}>Less Interest Deduction:</Text>
                    <Text style={styles.liveCalcInterest}>- ₹{parsedLiveInterest.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.liveCalcDivider} />
                  <View style={styles.liveCalcRow}>
                    <Text style={styles.liveCalcNetLabel}>Net Customer Payout (Upfront):</Text>
                    <Text style={styles.liveCalcNetValue}>₹{parsedLivePayout.toLocaleString('en-IN')}</Text>
                  </View>

                  {/* Installment Equality Check in Summary */}
                  <View style={styles.liveRepaymentBox}>
                    <View style={styles.liveCalcRow}>
                      <Text style={styles.liveCalcLabel}>Total Repaid from Installments:</Text>
                      <Text style={[styles.liveCalcValue, isRepaymentMatching ? styles.greenText : styles.amberText]}>
                        {parsedLiveDuration} × ₹{parsedLiveCollection.toLocaleString('en-IN')} = ₹{liveTotalCollected.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    {isRepaymentMatching ? (
                      <View style={styles.matchAlertSuccess}>
                        <Text style={styles.matchAlertSuccessText}>
                          ✓ Equal: Total collections (₹{liveTotalCollected.toLocaleString('en-IN')}) exactly match Scheme Value (₹{parsedLiveTotal.toLocaleString('en-IN')})
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.matchAlertWarning}>
                        <Text style={styles.matchAlertWarningText}>
                          ⚠️ Total collections (₹{liveTotalCollected.toLocaleString('en-IN')}) do not equal scheme value (₹{parsedLiveTotal.toLocaleString('en-IN')}).
                        </Text>
                        <View style={styles.quickFixRow}>
                          {parsedLiveCollection > 0 && (
                            <TouchableOpacity
                              style={styles.quickFixBtn}
                              onPress={() => setDuration(Math.round(parsedLiveTotal / parsedLiveCollection).toString())}
                            >
                              <Text style={styles.quickFixBtnText}>
                                Set Duration to {Math.round(parsedLiveTotal / parsedLiveCollection)}
                              </Text>
                            </TouchableOpacity>
                          )}
                          {parsedLiveDuration > 0 && (
                            <TouchableOpacity
                              style={styles.quickFixBtn}
                              onPress={() => setCollectionAmount(Math.round(parsedLiveTotal / parsedLiveDuration).toString())}
                            >
                              <Text style={styles.quickFixBtnText}>
                                Set Installment to ₹{Math.round(parsedLiveTotal / parsedLiveDuration)}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              <FormInput
                label="Scheme Name"
                placeholder="e.g. Gold 3-Day 50K"
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  setFormError('');
                }}
              />

              <FormInput
                label="Total Scheme Value (₹)"
                placeholder="e.g. 50000"
                value={totalAmount}
                onChangeText={handleTotalAmountChange}
                keyboardType="numeric"
              />

              <FormInput
                label="Upfront Interest / Deduction (₹)"
                placeholder="e.g. 4000"
                value={interestAmount}
                onChangeText={(val) => {
                  setInterestAmount(val);
                  setFormError('');
                }}
                keyboardType="numeric"
              />

              <FormInput
                label="Installment Collection Amount (₹)"
                placeholder="e.g. 1000"
                value={collectionAmount}
                onChangeText={handleCollectionAmountChange}
                keyboardType="numeric"
              />

              <FormInput
                label="Duration (Number of Installments)"
                placeholder="e.g. 50"
                value={duration}
                onChangeText={handleDurationChange}
                keyboardType="numeric"
              />

              <Text style={styles.modalLabel}>Collection Frequency</Text>
              <View style={styles.freqContainer}>
                {(['daily', 'every_3_days', 'weekly', 'monthly'] as const).map((freqOption) => {
                  const isSelected = frequency === freqOption;
                  const label = formatFrequency(freqOption);
                  return (
                    <TouchableOpacity
                      key={freqOption}
                      style={[
                        styles.freqBtn,
                        isSelected ? styles.freqBtnSelected : null,
                      ]}
                      onPress={() => setFrequency(freqOption)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.freqBtnText, isSelected ? styles.freqBtnTextSelected : null]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Button
                title={editingSchemeId ? 'Save Scheme Changes' : 'Create Scheme'}
                onPress={handleSaveScheme}
                style={styles.modalSubmitBtn}
                size="large"
              />
            </ScrollView>
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
    paddingTop: SPACING.md,
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
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  profileBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  profileBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 12,
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
  listContent: {
    padding: SPACING.md,
    paddingBottom: 80,
  },
  schemeCard: {
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  schemeTitleBlock: {
    flex: 1,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  schemeName: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 4,
  },
  statusText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 10,
  },
  memberBadge: {
    backgroundColor: COLORS.secondaryLight,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: 6,
  },
  memberBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 10,
  },
  headerBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtn: {
    backgroundColor: COLORS.primaryLight + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primaryLight + '30',
  },
  editBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
    fontSize: 10,
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.danger,
    fontSize: 10,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  payoutHighlightRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payoutCol: {
    flex: 1,
  },
  payoutColMain: {
    flex: 1.3,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
  },
  payoutLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 8,
  },
  payoutValue: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
    marginTop: 2,
    fontSize: 13,
  },
  interestValue: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#D97706',
    marginTop: 2,
    fontSize: 13,
  },
  netPayoutLabel: {
    ...TYPOGRAPHY.captionBold,
    color: '#047857',
    fontSize: 8,
  },
  netPayoutValue: {
    ...TYPOGRAPHY.amountMedium,
    color: '#059669',
    fontSize: 15,
    marginTop: 1,
  },
  netPayoutSubtitle: {
    ...TYPOGRAPHY.caption,
    color: '#047857',
    fontSize: 8,
  },
  repaymentSummaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    marginBottom: SPACING.xs,
  },
  repaymentFormulaText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontSize: 11,
  },
  boldText: {
    fontWeight: '700',
    color: COLORS.text,
  },
  boldGreenText: {
    fontWeight: '700',
    color: '#059669',
  },
  exactMatchBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  exactMatchBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#047857',
    fontSize: 9,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.xs,
  },
  gridCell: {
    width: '33.33%',
    marginVertical: SPACING.xs,
  },
  detailLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    fontSize: 9,
  },
  detailValue: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
    marginTop: 2,
    fontSize: 12,
  },
  capitalize: {
    textTransform: 'capitalize',
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
    bottom: 24,
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
  // Modal styles
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
  modalError: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.danger,
    marginBottom: SPACING.md,
  },
  liveCalcCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  liveCalcTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  liveCalcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  liveCalcLabel: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    fontSize: 13,
  },
  liveCalcValue: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
    fontSize: 13,
  },
  liveCalcInterest: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#D97706',
    fontSize: 13,
  },
  liveCalcDivider: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: SPACING.xs + 2,
  },
  liveCalcNetLabel: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#047857',
    fontSize: 14,
  },
  liveCalcNetValue: {
    ...TYPOGRAPHY.amountMedium,
    color: '#059669',
    fontSize: 16,
  },
  liveRepaymentBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  greenText: {
    color: '#059669',
  },
  amberText: {
    color: '#D97706',
  },
  matchAlertSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
  },
  matchAlertSuccessText: {
    ...TYPOGRAPHY.captionBold,
    color: '#047857',
    fontSize: 11,
  },
  matchAlertWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
  },
  matchAlertWarningText: {
    ...TYPOGRAPHY.captionBold,
    color: '#B45309',
    fontSize: 11,
  },
  quickFixRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  quickFixBtn: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quickFixBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: '#92400E',
    fontSize: 10,
  },
  modalLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primaryLight,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  freqContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
    marginBottom: SPACING.md,
  },
  freqBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm + 4,
    margin: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  freqBtnSelected: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  freqBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  freqBtnTextSelected: {
    color: COLORS.white,
  },
  modalSubmitBtn: {
    marginBottom: SPACING.xl,
  },
  profileWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
  },
  profileWarningIcon: {
    fontSize: 20,
    marginRight: 2,
  },
  profileWarningTitle: {
    ...TYPOGRAPHY.captionBold,
    color: '#92400E',
    fontSize: 12,
  },
  profileWarningText: {
    ...TYPOGRAPHY.caption,
    color: '#B45309',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  profileWarningAction: {
    ...TYPOGRAPHY.captionBold,
    color: '#D97706',
    marginLeft: SPACING.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
  },
  policyNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BAE6FD',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  policyNoticeIcon: {
    fontSize: 15,
    marginRight: SPACING.xs + 2,
  },
  policyNoticeText: {
    ...TYPOGRAPHY.caption,
    color: '#0369A1',
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  modalEditNoticeBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.md,
  },
  modalEditNoticeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#15803D',
    fontSize: 11,
    lineHeight: 16,
  },
});

export default SchemesScreen;
