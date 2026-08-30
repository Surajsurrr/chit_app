import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../../constants/theme';
import Card from '../../components/Card';
import { StatusBar } from 'expo-status-bar';

export const CustomersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { customers, getCustomerStats } = useChitData();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const renderCustomerItem = ({ item }: { item: typeof customers[0] }) => {
    const stats = getCustomerStats(item.id);

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
        activeOpacity={0.8}
        style={styles.cardWrapper}
      >
        <Card style={styles.customerCard}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.nameText}>{item.name}</Text>
              <Text style={styles.phoneText}>+91 {item.phone}</Text>
            </View>
            <TouchableOpacity
              style={styles.collectBtn}
              onPress={() => navigation.navigate('Collections', { customerId: item.id })}
            >
              <Text style={styles.collectBtnText}>Collect</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.financialRow}>
            <View style={styles.finCol}>
              <Text style={styles.finLabel}>TOTAL GIVEN</Text>
              <Text style={styles.finValue}>₹{item.amountGiven.toLocaleString('en-IN')}</Text>
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
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customers</Text>
        <Text style={styles.headerSubtitle}>Manage and search member records</Text>
      </View>

      <View style={styles.content}>
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            keyboardType="default"
            autoCapitalize="none"
          />
        </View>

        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No customers found.</Text>
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

      {/* Floating Action Button (FAB) for Add Customer */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddCustomer')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
    paddingBottom: 80, // space for FAB
  },
  cardWrapper: {
    marginBottom: SPACING.md,
  },
  customerCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  nameText: {
    ...TYPOGRAPHY.bodyLarge,
    fontWeight: '700',
    color: COLORS.text,
  },
  phoneText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  collectBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm - 2,
    borderRadius: 8,
  },
  collectBtnText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.white,
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
    color: COLORS.danger,
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
});

export default CustomersScreen;
