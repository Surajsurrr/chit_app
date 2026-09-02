import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Card from '../../components/Card';
import FormInput from '../../components/FormInput';
import Button from '../../components/Button';
import { StatusBar } from 'expo-status-bar';
import { Scheme } from '../../data/mockData';

export const SchemesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { schemes, customers, addScheme, updateScheme, logout } = useChitData();

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
    return customers.filter((c) => c.schemeId === schemeId).length;
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

  const handleSaveScheme = () => {
    if (!name.trim() || !totalAmount || !collectionAmount || !duration) {
      setFormError('All required fields must be filled');
      return;
    }

    const total = parseFloat(totalAmount);
    const collection = parseFloat(collectionAmount);
    const parsedInterest = interestAmount ? parseFloat(interestAmount) : 0;
    const dur = parseInt(duration, 10);

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
    if (isNaN(dur) || dur <= 0) {
      setFormError('Duration must be a positive number');
      return;
    }

    if (editingSchemeId) {
      // Update existing scheme
      updateScheme(editingSchemeId, {
        name: name.trim(),
        totalAmount: total,
        collectionAmount: collection,
        interestAmount: parsedInterest,
        frequency,
        durationWeeksOrMonths: dur,
      });
    } else {
      // Add new scheme
      addScheme({
        name: name.trim(),
        totalAmount: total,
        collectionAmount: collection,
        interestAmount: parsedInterest,
        frequency,
        durationWeeksOrMonths: dur,
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

  const renderSchemeItem = ({ item }: { item: Scheme }) => {
    const memberCount = getCustomerCount(item.id);

    return (
      <Card style={styles.schemeCard} padding={SPACING.md}>
        <View style={styles.cardHeader}>
          <View style={styles.schemeTitleBlock}>
            <Text style={styles.schemeName}>{item.name}</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>

          <View style={styles.cardHeaderRight}>
            <View style={styles.memberBadge}>
              <Text style={styles.memberBadgeText}>{memberCount} {memberCount === 1 ? 'member' : 'members'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.editBtn} 
              onPress={() => handleOpenEditModal(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.editBtnText}>✏️ Edit Scheme</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsGrid}>
          <View style={styles.gridCell}>
            <Text style={styles.detailLabel}>TOTAL VALUE</Text>
            <Text style={styles.detailValue}>₹{item.totalAmount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.detailLabel}>COLLECTION</Text>
            <Text style={styles.detailValue}>₹{item.collectionAmount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.detailLabel}>INTEREST (EXTRA)</Text>
            <Text style={[styles.detailValue, { color: COLORS.secondary }]}>
              ₹{(item.interestAmount || 0).toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.detailLabel}>FREQUENCY</Text>
            <Text style={[styles.detailValue, styles.capitalize]}>{item.frequency.replace(/_/g, ' ')}</Text>
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
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Chit Schemes</Text>
          <Text style={styles.headerSubtitle}>Manage & update interest plans</Text>
        </View>
        <TouchableOpacity style={styles.roleBtn} onPress={() => logout()}>
          <Text style={styles.roleBtnText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
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
              {formError ? <Text style={styles.modalError}>{formError}</Text> : null}

              <FormInput
                label="Scheme Name"
                placeholder="e.g. Gold Monthly 1L"
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  setFormError('');
                }}
              />

              <FormInput
                label="Total Scheme Value (₹)"
                placeholder="e.g. 100000"
                value={totalAmount}
                onChangeText={(val) => {
                  setTotalAmount(val);
                  setFormError('');
                }}
                keyboardType="numeric"
              />

              <FormInput
                label="Installment Collection Amount (₹)"
                placeholder="e.g. 2000"
                value={collectionAmount}
                onChangeText={(val) => {
                  setCollectionAmount(val);
                  setFormError('');
                }}
                keyboardType="numeric"
              />

              <FormInput
                label="Scheme Interest Amount (₹)"
                placeholder="e.g. 2500"
                value={interestAmount}
                onChangeText={(val) => {
                  setInterestAmount(val);
                  setFormError('');
                }}
                keyboardType="numeric"
              />

              <FormInput
                label="Duration (Number of Installments)"
                placeholder="e.g. 50"
                value={duration}
                onChangeText={(val) => {
                  setDuration(val);
                  setFormError('');
                }}
                keyboardType="numeric"
              />

              <Text style={styles.modalLabel}>Collection Frequency</Text>
              <View style={styles.freqContainer}>
                {(['daily', 'every_3_days', 'weekly', 'monthly'] as const).map((freqOption) => {
                  const isSelected = frequency === freqOption;
                  const label = freqOption.replace(/_/g, ' ');
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
  editBtn: {
    backgroundColor: COLORS.primaryLight + '15',
    paddingHorizontal: SPACING.sm + 2,
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
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: '50%',
    marginVertical: SPACING.xs,
  },
  detailLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    fontSize: 8,
  },
  detailValue: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
    marginTop: 2,
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
  freqContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
    marginBottom: SPACING.xl,
  },
  freqBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
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
    textTransform: 'capitalize',
  },
  freqBtnTextSelected: {
    color: COLORS.white,
  },
  modalSubmitBtn: {
    marginBottom: SPACING.xl,
  },
});

export default SchemesScreen;
