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

  const handleAvailScheme = (schemeToAvail: Scheme) => {
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
            const interest = s.interestAmount || 0;
            const interestRate = ((interest / s.totalAmount) * 100).toFixed(1);
            const payout = s.payoutAmount || Math.max(0, s.totalAmount - interest);

            return (
              <Card key={s.id} style={[styles.availedCard, isPrimary && styles.primaryAvailedCard]}>
                {/* Header row */}
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.schemeTitle}>{s.name}</Text>
                    <Text style={styles.schemeTag}>
                      ₹{s.collectionAmount.toLocaleString('en-IN')} · {formatFrequency(s.frequency)}
                    </Text>
                  </View>

                  <View style={styles.badgeCol}>
                    {isPrimary ? (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>✓ Active Focused</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.setPrimaryBtn}
                        onPress={() => handleSetPrimary(s)}
                      >
                        <Text style={styles.setPrimaryBtnText}>Set Active</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Financial Summary Grid */}
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

                {/* Repayment Progress bar */}
                {isPrimary && (
                  <View style={styles.progressBox}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>COLLECTED SO FAR</Text>
                      <Text style={styles.progressVal}>
                        ₹{stats.paidAmount.toLocaleString('en-IN')} of ₹{s.totalAmount.toLocaleString('en-IN')} ({stats.progressPercentage}%)
                      </Text>
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
            All schemes listed by the admin ({schemes.length} total schemes available)
          </Text>
        </View>

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
                    style={styles.availBtn}
                    onPress={() => handleAvailScheme(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.availBtnText}>Avail Scheme →</Text>
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
                    <Text style={styles.finNetLabel}>NET PAYOUT</Text>
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
