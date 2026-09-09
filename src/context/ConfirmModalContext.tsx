import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import ConfirmModal from '../components/ConfirmModal';
import AppToast from '../components/AppToast';
import { registerGlobalConfirmHandler, registerGlobalToastHandler } from '../utils/alertHelper';

export interface ConfirmOptions {
  title: string;
  message?: string;
  warningNote?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  icon?: string;
  onConfirm: () => Promise<void> | void;
  onCancel?: () => void;
}

export interface ToastOptions {
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'info';
  durationMs?: number;
}

interface ConfirmModalContextType {
  showConfirm: (options: ConfirmOptions) => void;
  hideConfirm: () => void;
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

const ConfirmModalContext = createContext<ConfirmModalContextType | undefined>(undefined);

export const ConfirmModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [confirmConfig, setConfirmConfig] = useState<ConfirmOptions | null>(null);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  const [toastConfig, setToastConfig] = useState<ToastOptions | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    setConfirmConfig(options);
    setIsConfirmLoading(false);
    setIsConfirmVisible(true);
  }, []);

  const hideConfirm = useCallback(() => {
    setIsConfirmVisible(false);
    setIsConfirmLoading(false);
    setConfirmConfig(null);
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    setToastConfig(options);
    setIsToastVisible(true);
  }, []);

  const hideToast = useCallback(() => {
    setIsToastVisible(false);
    setToastConfig(null);
  }, []);

  // Hook into alertHelper so existing confirmAction and showInfoMessage calls seamlessly use our UI
  useEffect(() => {
    registerGlobalConfirmHandler((opts) => {
      showConfirm(opts);
    });

    registerGlobalToastHandler((opts) => {
      showToast(opts);
    });
  }, [showConfirm, showToast]);

  const handleConfirmAction = async () => {
    if (!confirmConfig) return;
    try {
      setIsConfirmLoading(true);
      await confirmConfig.onConfirm();
    } catch (err) {
      console.error('ConfirmModal onConfirm error:', err);
    } finally {
      hideConfirm();
    }
  };

  const handleCancelAction = () => {
    if (confirmConfig?.onCancel) {
      confirmConfig.onCancel();
    }
    hideConfirm();
  };

  return (
    <ConfirmModalContext.Provider
      value={{
        showConfirm,
        hideConfirm,
        showToast,
        hideToast,
      }}
    >
      <View style={styles.container}>
        {children}

        {/* Global In-App Confirmation Modal */}
        {confirmConfig && (
          <ConfirmModal
            visible={isConfirmVisible}
            title={confirmConfig.title}
            message={confirmConfig.message}
            warningNote={confirmConfig.warningNote}
            confirmText={confirmConfig.confirmText}
            cancelText={confirmConfig.cancelText}
            isDestructive={confirmConfig.isDestructive ?? true}
            icon={confirmConfig.icon}
            isLoading={isConfirmLoading}
            onConfirm={handleConfirmAction}
            onCancel={handleCancelAction}
          />
        )}

        {/* Global In-App Toast Notification */}
        {toastConfig && (
          <AppToast
            visible={isToastVisible}
            title={toastConfig.title}
            message={toastConfig.message}
            type={toastConfig.type || 'success'}
            durationMs={toastConfig.durationMs || 3000}
            onDismiss={hideToast}
          />
        )}
      </View>
    </ConfirmModalContext.Provider>
  );
};

export const useConfirmModal = (): ConfirmModalContextType => {
  const context = useContext(ConfirmModalContext);
  if (!context) {
    throw new Error('useConfirmModal must be used within a ConfirmModalProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
