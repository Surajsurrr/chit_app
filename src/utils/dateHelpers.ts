export const formatDateLong = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
};

export const formatDateShort = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
};

export const calculateNextPaymentDate = (
  lastPaymentDateStr: string,
  frequency: 'daily' | 'every_3_days' | 'weekly' | 'monthly'
): string => {
  const date = new Date(lastPaymentDateStr);
  if (isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'every_3_days':
      date.setDate(date.getDate() + 3);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      date.setDate(date.getDate() + 1);
  }

  return date.toISOString();
};

export const isPaymentDue = (nextPaymentDateStr: string): boolean => {
  try {
    const nextDate = new Date(nextPaymentDateStr);
    if (isNaN(nextDate.getTime())) return false;
    
    // Compare dates ignoring time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const compareDate = new Date(nextDate);
    compareDate.setHours(0, 0, 0, 0);
    
    return compareDate.getTime() <= today.getTime();
  } catch (e) {
    return false;
  }
};

export const getStatusLabel = (nextPaymentDateStr: string, remainingAmount: number): 'PAID' | 'OVERDUE' | 'DUE' => {
  if (remainingAmount <= 0) return 'PAID';
  
  try {
    const nextDate = new Date(nextPaymentDateStr);
    if (isNaN(nextDate.getTime())) return 'DUE';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const compareDate = new Date(nextDate);
    compareDate.setHours(0, 0, 0, 0);
    
    if (compareDate.getTime() < today.getTime()) {
      return 'OVERDUE';
    } else {
      return 'DUE';
    }
  } catch (e) {
    return 'DUE';
  }
};
