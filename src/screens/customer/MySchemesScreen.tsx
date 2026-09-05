import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { formatFrequency } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';
import { Scheme } from '../../data/mockData';

export const MySchemesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    selectedCustomerId,
    customers,
    schemes,
    getCustomerStats,
    updateCustomerScheme,
    logout,
    isAdminProfileComplete,
    isCustomerProfileComplete,
    currentAdmin,
  } = useChitData();

  const customer = customers.find((c) => c.id === selectedCustomerId);

  if (!customer) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Customer account not selected.</Text>
        <Button title="Log Out" onPress={() => logout()} />
      </SafeAreaView>
    );
  }

  const stats = getCustomerStats(customer.id);
  const enrolledIds = customer.enrolledSchemeIds || (customer.schemeId ? [customer.schemeId] : []);
  const availedSchemes = schemes.filter((s) => enrolledIds.includes(s.id));
  const otherAvailableSchemes = schemes.filter((s) => !enrolledIds.includes(s.id));
  const isCustProfileComplete = isCustomerProfileComplete(customer.id);

  const handleAvailScheme = (schemeToAvail: Scheme) => {
    // 1. Mandatory Admin Profile Setup Check
    if (!isAdminProfileComplete) {
      Alert.alert(
        'Schemes Unavailable 🔒',
        'The chit fund organizer has not completed their profile setup yet. Schemes cannot be availed until the organizer sets up their profile.'
      );
      return;
    }

    // 2. Mandatory Customer Profile Setup Check
    if (!isCustProfileComplete) {
      Alert.alert(
        'Profile Setup Required 📝',
        'You must complete your profile details (including your Email and Residential Address) before you can avail any chit scheme.\n\nTap "Complete Profile" to update your details now.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete Profile', onPress: () => navigation.navigate('Profile') },
        ]
      );
      return;
    }

    const interest = schemeToAvail.interestAmount || 0;
    const payout = schemeToAvail.payoutAmount || (schemeToAvail.totalAmount - interest);

    Alert.alert(
      'Avail Chit Scheme',
      `Would you like to avail "${schemeToAvail.name}"?\n\n• Total Scheme Value: ₹${schemeToAvail.totalAmount.toLocaleString('en-IN')}\n• Upfront Net Payout: ₹${payout.toLocaleString('en-IN')}\n• Installment: ₹${schemeToAvail.collectionAmount.toLocaleString('en-IN')} (${formatFrequency(schemeToAvail.frequency)})\n• Duration: ${schemeToAvail.durationWeeksOrMonths} collections`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Avail',
          onPress: async () => {
            const res = await updateCustomerScheme(customer.id, schemeToAvail.id);
            if (res.success) {
              Alert.alert(
                'Scheme Availed! 🎉',
                `You have successfully availed "${schemeToAvail.name}". It is now listed under your availed schemes.`
              );
            } else {
              Alert.alert('Error', res.error || 'Failed to avail scheme');
            }
          },
        },
      ]
    );
  };

  const handleSetPrimary = async (schemeToSet: Scheme) => {
    const res = await updateCustomerScheme(customer.id, schemeToSet.id);
    if (res.success) {
      Alert.alert('Active Scheme Updated', `"${schemeToSet.name}" is now set as your active primary scheme.`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>MEMBER PORTAL</Text>
          <Text style={styles.headerTitle}>My Schemes</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.profileBtnText}>Profile</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Section 1: Availed Schemes */}
        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Schemes Availed by Me</Text>
          <Text style={styles.sectionSubtitle}>
            {availedSchemes.length} {availedSchemes.length === 1 ? 'scheme' : 'schemes'} currently enrolled under admin
          </Text>
        </View>

        {availedSchemes.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Availed Schemes Yet</Text>
            <Text style={styles.emptyText}>Explore the available admin schemes below and click "Avail Scheme" to join.</Text>
          </Card>
        ) : (
          availedSchemes.map((s) => {
            const isPrimary = s.id === customer.schemeId;
            const snapshot = customer.enrolledSchemes?.find((es) => es.schemeId === s.id);

            // Customer's locked-in terms when enrolled (lasts forever)
            const totalVal = snapshot?.totalAmount ?? (isPrimary ? customer.amountGiven : s.totalAmount);
            const colVal = snapshot?.collectionAmount ?? (isPrimary ? customer.collectionAmount : s.collectionAmount);
            const freqVal = snapshot?.frequency ?? (isPrimary ? customer.frequency : s.frequency);
            const interest = snapshot?.interestAmount ?? s.interestAmount ?? 0;
            const interestRate = totalVal > 0 ? ((interest / totalVal) * 100).toFixed(1) : '0';
            const payout = snapshot?.payoutAmount ?? s.payoutAmount ?? Math.max(0, totalVal - interest);

            return (
              <Card key={s.id} style={[styles.availedCard, isPrimary && styles.primaryAvailedCard]}>
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1, marginRight: SPACING.sm }}>
                    <Text style={styles.schemeTitle}>{snapshot?.schemeName || s.name}</Text>
                    <Text style={styles.schemeTag}>
                      ₹{colVal.toLocaleString('en-IN')} · {formatFrequency(freqVal)} ({snapshot?.durationWeeksOrMonths || s.durationWeeksOrMonths} collections)
                    </Text>
                  </View>

                  <View style={styles.badgeCol}>
                    {isPrimary ? (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Active Primary</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.setPrimaryBtn}
                        onPress={() => handleSetPrimary(s)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.setPrimaryBtnText}>Set as Active</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Permanent terms highlight */}
                <View style={styles.financialGrid}>
                  <View style={styles.finCol}>
                    <Text style={styles.finLabel}>TOTAL VALUE</Text>
                    <Text style={styles.finValue}>₹{totalVal.toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={styles.finCol}>
                    <Text style={styles.finLabel}>INTEREST ({interestRate}%)</Text>
                    <Text style={styles.finInterest}>- ₹{interest.toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={styles.finColMain}>
                    <Text style={styles.finNetLabel}>NET UPFRONT PAYOUT</Text>
                    <Text style={styles.finNetValue}>₹{payout.toLocaleString('en-IN')}</Text>
                  </View>
                </View>

                {/* Progress bar if primary */}
                {isPrimary && (
                  <View style={styles.progressBox}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>REPAYMENT PROGRESS</Text>
                      <Text style={styles.progressVal}>{stats.progressPercentage.toFixed(0)}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFg, { width: `${stats.progressPercentage}%` }]} />
                    </View>
                  </View>
                )}

                {/* Notice replacing Make Payment button */}
                <View style={styles.schemeNoticeBox}>
                  <Text style={styles.schemeNoticeText}>
                    📌 Installment collections updated & recorded directly by Admin
                  </Text>
                </View>
              </Card>
            );
          })
        )}

        {/* Section 2: Explore & Avail Admin Schemes */}
        <View style={styles.sectionHeaderBox}>
          <Text style={styles.sectionTitle}>Available Admin Schemes</Text>
          <Text style={styles.sectionSubtitle}>
            {isAdminProfileComplete
              ? `All schemes listed by the admin (${schemes.length} total schemes available)`
              : 'Schemes visibility locked until organizer completes profile setup'}
          </Text>
        </View>

        {!isAdminProfileComplete ? (
          <Card style={styles.lockedCard}>
            <View style={styles.lockedIconBox}>
              <Text style={styles.lockedIcon}>🔒</Text>
            </View>
            <Text style={styles.lockedTitle}>Chit Schemes Unavailable</Text>
            <Text style={styles.lockedText}>
              The chit fund organizer has not completed their mandatory profile setup yet.
              {'\n\n'}
              As per platform policy, schemes and enrollment options will become visible to members once the administrator completes their verified organizer profile (Name, Phone, Email, Office Address).
            </Text>
            <View style={styles.lockedBadge}>
              <Text style={styles.lockedBadgeText}>Organizer Setup Pending</Text>
            </View>
          </Card>
        ) : (
          <>
            {/* Organizer details overview banner */}
            <View style={styles.organizerCard}>
              <View style={styles.organizerRow}>
                <View style={styles.organizerAvatar}>
                  <Text style={styles.organizerAvatarText}>
                    {currentAdmin?.name ? currentAdmin.name[0].toUpperCase() : '🏢'}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <Text style={styles.organizerTitle}>
                    Organized by {currentAdmin?.name || 'Administrator'}
                  </Text>
                  <Text style={styles.organizerFirm}>
                    {currentAdmin?.businessName || 'Verified Chit Fund Agency'}
                  </Text>
                  <Text style={styles.organizerContact}>
                    📞 +91 {currentAdmin?.phone || 'N/A'} · ✉️ {currentAdmin?.email || 'N/A'}
                  </Text>
                  {currentAdmin?.address && (
                    <Text style={styles.organizerAddress}>
                      📍 {currentAdmin.address}{currentAdmin.city ? `, ${currentAdmin.city}` : ''}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Customer profile incomplete warning banner */}
            {!isCustProfileComplete && (
              <TouchableOpacity
                style={styles.customerIncompleteBanner}
                onPress={() => navigation.navigate('Profile')}
                activeOpacity={0.85}
              >
                <Text style={styles.customerIncompleteIcon}>⚠️</Text>
                <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                  <Text style={styles.customerIncompleteTitle}>Profile Setup Required to Avail</Text>
                  <Text style={styles.customerIncompleteText}>
                    You must complete your profile details (Email and Residential Address) in the Profile tab before you can avail any scheme.
                  </Text>
                </View>
                <Text style={styles.customerIncompleteAction}>Setup →</Text>
              </TouchableOpacity>
            )}

            {otherAvailableSchemes.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>✓ All Schemes Enrolled</Text>
                <Text style={styles.emptyText}>You have currently availed all available schemes listed by the admin.</Text>
              </Card>
            ) : (
              otherAvailableSchemes.map((s) => {
                const interest = s.interestAmount || 0;
                const interestRate = ((interest / s.totalAmount) * 100).toFixed(1);
                const payout = s.payoutAmount || Math.max(0, s.totalAmount - interest);

                return (
                  <Card key={s.id} style={styles.exploreCard}>
                    <View style={styles.cardHeaderRow}>
                      <View style={{ flex: 1, marginRight: SPACING.sm }}>
                        <Text style={styles.schemeTitle}>{s.name}</Text>
                        <Text style={styles.schemeTag}>
                          ₹{s.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(s.frequency)} ({s.durationWeeksOrMonths} collections)
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.availBtn,
                          !isCustProfileComplete && styles.availBtnDisabled,
                        ]}
                        onPress={() => handleAvailScheme(s)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.availBtnText}>
                          {isCustProfileComplete ? 'Avail Scheme →' : 'Complete Profile'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.financialGrid}>
                      <View style={styles.finCol}>
                        <Text style={styles.finLabel}>TOTAL VALUE</Text>
                        <Text style={styles.finValue}>₹{s.totalAmount.toLocaleString('en-IN')}</Text>
                      </View>

                      <View style={styles.finCol}>
                        <Text style={styles.finLabel}>INTEREST ({interestRate}%)</Text>
                        <Text style={styles.finInterest}>- ₹{interest.toLocaleString('en-IN')}</Text>
                      </View>

                      <View style={styles.finColMain}>
                        <Text style={styles.finNetLabel}>NET UPFRONT PAYOUT</Text>
                        <Text style={styles.finNetValue}>₹{payout.toLocaleString('en-IN')}</Text>
                      </View>
                    </View>

                    {s.description ? (
                      <Text style={styles.schemeDesc}>{s.description}</Text>
                    ) : null}
                  </Card>
                );
              })
            )}
          </>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerSub: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textLight,
    letterSpacing: 1,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
    marginTop: 2,
  },
  profileBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  profileBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
  },
  scrollContent: {
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },
  sectionHeaderBox: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: SPACING.sm,
  },
  emptyCard: {
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  emptyText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  availedCard: {
    marginBottom: SPACING.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  primaryAvailedCard: {
    borderColor: COLORS.success,
    backgroundColor: '#F0FDF4',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  schemeTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
  },
  schemeTag: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 2,
  },
  badgeCol: {
    alignItems: 'flex-end',
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#065F46',
    fontSize: 11,
  },
  setPrimaryBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 8,
  },
  setPrimaryBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  financialGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  finCol: {
    flex: 1,
  },
  finColMain: {
    flex: 1.2,
    alignItems: 'flex-end',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 4,
    borderRadius: 6,
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
  finInterest: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: '#D97706',
    marginTop: 2,
  },
  finNetLabel: {
    ...TYPOGRAPHY.captionBold,
    color: '#047857',
    fontSize: 9,
  },
  finNetValue: {
    ...TYPOGRAPHY.amountMedium,
    color: '#059669',
    fontSize: 14,
    marginTop: 2,
  },
  progressBox: {
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.white,
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textMuted,
    fontSize: 10,
  },
  progressVal: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
    fontSize: 10,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFg: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  schemeNoticeBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 8,
    padding: SPACING.xs + 2,
    marginTop: 4,
    alignItems: 'center',
  },
  schemeNoticeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#0369A1',
    fontSize: 10,
  },
  exploreCard: {
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  availBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 8,
  },
  availBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 11,
  },
  schemeDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  lockedCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  lockedIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  lockedIcon: {
    fontSize: 28,
  },
  lockedTitle: {
    ...TYPOGRAPHY.h3,
    color: '#334155',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  lockedText: {
    ...TYPOGRAPHY.bodyMedium,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  lockedBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  lockedBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: '#92400E',
  },
  organizerCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  organizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerAvatarText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.white,
    fontSize: 18,
  },
  organizerTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  organizerFirm: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
    marginTop: 1,
  },
  organizerContact: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
    fontSize: 11,
  },
  organizerAddress: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginTop: 1,
    fontSize: 11,
  },
  customerIncompleteBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerIncompleteIcon: {
    fontSize: 22,
  },
  customerIncompleteTitle: {
    ...TYPOGRAPHY.captionBold,
    color: '#92400E',
    fontSize: 12,
  },
  customerIncompleteText: {
    ...TYPOGRAPHY.caption,
    color: '#B45309',
    marginTop: 2,
    fontSize: 11,
    lineHeight: 15,
  },
  customerIncompleteAction: {
    ...TYPOGRAPHY.captionBold,
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: SPACING.xs,
  },
  availBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  errorText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.danger,
    marginBottom: SPACING.lg,
  },
});

export default MySchemesScreen;
