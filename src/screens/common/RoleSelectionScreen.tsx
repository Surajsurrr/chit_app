import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import Card from '../../components/Card';
import { StatusBar } from 'expo-status-bar';

export const RoleSelectionScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { switchRole, selectCustomer, customers, currentRole } = useChitData();

  const handleAdminSelect = () => {
    switchRole('admin');
  };

  const handleCustomerSelect = (customerId: string) => {
    selectCustomer(customerId);
    switchRole('customer');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.brandTitle}>ChitFlow</Text>
        <Text style={styles.brandSubtitle}>Recurring Payment & Collection System</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Choose Account Type</Text>

        {/* Admin Selection Card */}
        <TouchableOpacity onPress={handleAdminSelect} activeOpacity={0.9} style={styles.cardWrapper}>
          <Card style={styles.adminCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Organizer / Admin Portal</Text>
              <View style={[styles.badge, styles.adminBadge]}>
                <Text style={styles.adminBadgeText}>ADMIN</Text>
              </View>
            </View>
            <Text style={styles.cardDesc}>
              Manage chit schemes, add new customers, monitor aggregate financials, and record cash/UPI collections.
            </Text>
          </Card>
        </TouchableOpacity>

        {/* Customer Selection Section */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Member / Customer Login</Text>
        <Text style={styles.helperText}>Select an enrolled member account or register a new one:</Text>

        {customers.length === 0 ? (
          <Card style={styles.emptyCustCard}>
            <Text style={styles.emptyCustIcon}>👥</Text>
            <Text style={styles.emptyCustTitle}>No Members Registered Yet</Text>
            <Text style={styles.emptyCustText}>
              Log in as Organizer / Admin above to register customers, or use the Member Sign Up tab on the Login page to register.
            </Text>
          </Card>
        ) : (
          customers.map((customer) => (
            <TouchableOpacity
              key={customer.id}
              onPress={() => handleCustomerSelect(customer.id)}
              activeOpacity={0.8}
              style={styles.cardWrapper}
            >
              <Card style={styles.customerCard}>
                <View style={styles.customerCardContent}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {customer.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{customer.name}</Text>
                    <Text style={styles.customerPhone}>+91 {customer.phone}</Text>
                    <Text style={styles.customerScheme}>
                      Scheme: {customer.amountGiven >= 100000 ? `₹${customer.amountGiven / 100000}L` : `₹${customer.amountGiven.toLocaleString('en-IN')}`}
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  brandTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.white,
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  scrollContent: {
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    flexGrow: 1,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  helperText: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  cardWrapper: {
    marginBottom: SPACING.md,
  },
  adminCard: {
    backgroundColor: COLORS.primaryLight,
    borderLeftWidth: 6,
    borderLeftColor: COLORS.secondary,
    padding: SPACING.md + 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.white,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adminBadge: {
    backgroundColor: COLORS.secondary,
  },
  adminBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
    fontSize: 9,
  },
  cardDesc: {
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  customerCard: {
    backgroundColor: COLORS.white,
    borderLeftWidth: 6,
    borderLeftColor: COLORS.success,
  },
  customerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.success,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  customerPhone: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  customerScheme: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.primary,
    marginTop: 4,
  },
  emptyCustCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    alignItems: 'center',
    borderRadius: 12,
    marginTop: SPACING.sm,
  },
  emptyCustIcon: {
    fontSize: 28,
    marginBottom: SPACING.xs,
  },
  emptyCustTitle: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
    marginBottom: 4,
  },
  emptyCustText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default RoleSelectionScreen;
