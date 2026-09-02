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

export const formatFrequency = (frequency: string): string => {
  switch (frequency) {
    case 'daily':
      return 'Every Day';
    case 'every_3_days':
      return 'Every 3 Days';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    default:
      return frequency.replace(/every_/g, '').replace(/_/g, ' ');
  }
};

export interface PaymentStatusInfo {
  status: 'PAID' | 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';
  isOverdue: boolean;
  daysOverdue: number;
  badgeLabel: 'PAID' | 'OVERDUE' | 'DUE TODAY' | 'UPCOMING';
  statusText: string;
  formattedDueDate: string;
  frequencyLabel: string;
}

export const getPaymentStatusInfo = (
  nextPaymentDateStr: string,
  remainingAmount: number,
  frequency?: string
): PaymentStatusInfo => {
  const formattedDueDate = formatDateShort(nextPaymentDateStr);
  const freqLabel = frequency ? formatFrequency(frequency) : '';

  if (remainingAmount <= 0) {
    return {
      status: 'PAID',
      isOverdue: false,
      daysOverdue: 0,
      badgeLabel: 'PAID',
      statusText: 'All Installments Settled',
      formattedDueDate,
      frequencyLabel: freqLabel,
    };
  }

  try {
    const nextDate = new Date(nextPaymentDateStr);
    if (isNaN(nextDate.getTime())) {
      return {
        status: 'UPCOMING',
        isOverdue: false,
        daysOverdue: 0,
        badgeLabel: 'UPCOMING',
        statusText: 'Scheduled',
        formattedDueDate,
        frequencyLabel: freqLabel,
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const compareDate = new Date(nextDate);
    compareDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - compareDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return {
        status: 'OVERDUE',
        isOverdue: true,
        daysOverdue: diffDays,
        badgeLabel: 'OVERDUE',
        statusText: diffDays === 1 ? 'Overdue by 1 day' : `Overdue by ${diffDays} days`,
        formattedDueDate,
        frequencyLabel: freqLabel,
      };
    } else if (diffDays === 0) {
      return {
        status: 'DUE_TODAY',
        isOverdue: false,
        daysOverdue: 0,
        badgeLabel: 'DUE TODAY',
        statusText: 'Payment Due Today',
        formattedDueDate,
        frequencyLabel: freqLabel,
      };
    } else {
      const remainingDays = Math.abs(diffDays);
      return {
        status: 'UPCOMING',
        isOverdue: false,
        daysOverdue: 0,
        badgeLabel: 'UPCOMING',
        statusText: remainingDays === 1 ? 'Due tomorrow' : `Due in ${remainingDays} days`,
        formattedDueDate,
        frequencyLabel: freqLabel,
      };
    }
  } catch (e) {
    return {
      status: 'UPCOMING',
      isOverdue: false,
      daysOverdue: 0,
      badgeLabel: 'UPCOMING',
      statusText: 'Scheduled',
      formattedDueDate,
      frequencyLabel: freqLabel,
    };
  }
};

export const getStatusLabel = (nextPaymentDateStr: string, remainingAmount: number): 'PAID' | 'OVERDUE' | 'DUE' => {
  const info = getPaymentStatusInfo(nextPaymentDateStr, remainingAmount);
  if (info.status === 'PAID') return 'PAID';
  if (info.status === 'OVERDUE') return 'OVERDUE';
  return 'DUE';
};
