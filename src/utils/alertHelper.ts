import { Alert, Platform } from 'react-native';

export interface ConfirmHandlerOptions {
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

export interface ToastHandlerOptions {
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'info';
  durationMs?: number;
}

let globalConfirmHandler: ((options: ConfirmHandlerOptions) => void) | null = null;
let globalToastHandler: ((options: ToastHandlerOptions) => void) | null = null;

export function registerGlobalConfirmHandler(handler: (options: ConfirmHandlerOptions) => void) {
  globalConfirmHandler = handler;
}

export function registerGlobalToastHandler(handler: (options: ToastHandlerOptions) => void) {
  globalToastHandler = handler;
}

/**
 * Polyfills React Native Web's empty Alert.alert implementation with our in-app UI
 */
export function setupAlertPolyfill() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    Alert.alert = (
      title: string,
      message?: string,
      buttons?: Array<{
        text?: string;
        onPress?: () => void;
        style?: 'default' | 'cancel' | 'destructive';
      }>
    ) => {
      // 0 or 1 button -> Show in-app Toast
      if (!buttons || buttons.length <= 1) {
        if (globalToastHandler) {
          globalToastHandler({
            title,
            message,
            type: title.toLowerCase().includes('error') ? 'error' : 'success',
          });
          if (buttons && buttons[0] && buttons[0].onPress) {
            buttons[0].onPress();
          }
          return;
        }

        // Fallback if UI not yet mounted
        const fullMessage = [title, message].filter(Boolean).join('\n\n');
        window.alert(fullMessage);
        if (buttons && buttons[0] && buttons[0].onPress) {
          buttons[0].onPress();
        }
        return;
      }

      // 2 or more buttons -> Show in-app Confirm Modal
      const cancelBtn = buttons.find(
        (b) => b.style === 'cancel' || b.text?.toLowerCase() === 'cancel'
      );
      const actionBtn =
        buttons.find((b) => b !== cancelBtn) || buttons[buttons.length - 1];

      if (globalConfirmHandler) {
        globalConfirmHandler({
          title,
          message,
          confirmText: actionBtn?.text || 'Confirm',
          cancelText: cancelBtn?.text || 'Cancel',
          isDestructive: actionBtn?.style === 'destructive',
          onConfirm: () => {
            if (actionBtn && actionBtn.onPress) {
              actionBtn.onPress();
            }
          },
          onCancel: () => {
            if (cancelBtn && cancelBtn.onPress) {
              cancelBtn.onPress();
            }
          },
        });
        return;
      }

      // Fallback
      const fullMessage = [title, message].filter(Boolean).join('\n\n');
      const confirmed = window.confirm(fullMessage);
      if (confirmed) {
        if (actionBtn && actionBtn.onPress) {
          actionBtn.onPress();
        }
      } else {
        if (cancelBtn && cancelBtn.onPress) {
          cancelBtn.onPress();
        }
      }
    };
  }
}

// Ensure polyfill initializes immediately
setupAlertPolyfill();

/**
 * Universal in-app confirmation dialog (uses sleek In-App UI on Web & Native)
 */
export const confirmAction = (
  title: string,
  message: string,
  onConfirm: () => void | Promise<void>,
  confirmText: string = 'Delete',
  cancelText: string = 'Cancel',
  onCancel?: () => void,
  customOptions?: Partial<ConfirmHandlerOptions>
) => {
  // Extract warning notes if formatted with "\n\nNote:" or "\n\n⚠️"
  let mainMsg = message;
  let warningNote = customOptions?.warningNote;

  if (!warningNote && message.includes('\n\n')) {
    const parts = message.split('\n\n');
    const warningParts = parts.filter(
      (p) => p.startsWith('Note:') || p.startsWith('⚠️') || p.includes('only scheme')
    );
    if (warningParts.length > 0) {
      warningNote = warningParts.join('\n');
      mainMsg = parts.filter((p) => !warningParts.includes(p)).join('\n\n');
    }
  }

  // If in-app UI handler is available, prioritize the in-app confirmation modal!
  if (globalConfirmHandler) {
    globalConfirmHandler({
      title,
      message: mainMsg,
      warningNote,
      confirmText,
      cancelText,
      isDestructive: customOptions?.isDestructive ?? true,
      icon: customOptions?.icon || '🗑️',
      onConfirm,
      onCancel,
      ...customOptions,
    });
    return;
  }

  // Fallback for Web if root context hasn't loaded yet
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const fullText = [title, message].filter(Boolean).join('\n\n');
    const confirmed = window.confirm(fullText);
    if (confirmed) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
    return;
  }

  // Fallback for native
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel', onPress: onCancel },
    { text: confirmText, style: 'destructive', onPress: () => { onConfirm(); } },
  ]);
};

/**
 * Universal in-app info/success notification (uses sleek In-App Toast)
 */
export const showInfoMessage = (
  title: string,
  message?: string,
  onOk?: () => void,
  type: 'success' | 'error' | 'info' = 'success'
) => {
  // If in-app toast handler is available, show sleek floating toast!
  if (globalToastHandler) {
    globalToastHandler({
      title,
      message,
      type: title.toLowerCase().includes('error') ? 'error' : type,
      durationMs: 3000,
    });
    if (onOk) onOk();
    return;
  }

  // Fallback for Web
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const fullText = [title, message].filter(Boolean).join('\n\n');
    window.alert(fullText);
    if (onOk) onOk();
    return;
  }

  // Fallback for native
  Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
};
