import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useChitData } from '../../context/ChitDataContext';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import Card from '../../components/Card';
import { formatDateShort } from '../../utils/dateHelpers';
import { StatusBar } from 'expo-status-bar';

export const ReceiptsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { selectedCustomerId, receipts } = useChitData();
  const [searchQuery, setSearchQuery] = useState('');

  const customerReceipts = receipts.filter((r) => r.customerId === selectedCustomerId);
  
  const filteredReceipts = customerReceipts.filter(
    (r) =>
      r.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.amount.toString().includes(searchQuery)
  );

  const renderReceiptItem = ({ item }: { item: typeof receipts[0] }) => {
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('ReceiptDetail', { receiptId: item.id })}
        activeOpacity={0.8}
        style={styles.cardWrapper}
      >
        <Card style={styles.receiptCard} padding={SPACING.md}>
          <View style={styles.row}>
            <View style={styles.leftCol}>
              <Text style={styles.receiptNum}>{item.receiptNumber}</Text>
              <Text style={styles.dateText}>{formatDateShort(item.date)} · {item.method}</Text>
            </View>
            <View style={styles.rightCol}>
              <Text style={styles.amountText}>₹{item.amount.toLocaleString('en-IN')}</Text>
              <Text style={styles.viewLink}>View Details</Text>
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
        <Text style={styles.headerTitle}>My Receipts</Text>
        <Text style={styles.headerSubtitle}>View and download payment transactions</Text>
      </View>

      <View style={styles.content}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by receipt number or amount..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {filteredReceipts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No receipts found.</Text>
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
  },
  cardWrapper: {
    marginBottom: SPACING.sm,
  },
  receiptCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftCol: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  receiptNum: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.text,
  },
  dateText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  amountText: {
    ...TYPOGRAPHY.bodyMediumBold,
    color: COLORS.primary,
  },
  viewLink: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.secondary,
    marginTop: 4,
    fontSize: 10,
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
});

export default ReceiptsScreen;
