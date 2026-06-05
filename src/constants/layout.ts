import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Tallest tab bar content area (patient) */
export const TAB_BAR_BASE_HEIGHT = 85;

/** FAB floats above the bar */
export const TAB_BAR_FAB_OVERFLOW = 28;

/** Default bottom padding for scroll content under floating tab bar */
export const TAB_BAR_CLEARANCE = TAB_BAR_BASE_HEIGHT + TAB_BAR_FAB_OVERFLOW + 24;

/** Bottom offset for floating action buttons */
export const TAB_BAR_FAB_BOTTOM = TAB_BAR_CLEARANCE + 12;

/** Dynamic clearance including device safe area */
export function useTabBarClearance(extra = 12): number {
    const insets = useSafeAreaInsets();
    return TAB_BAR_BASE_HEIGHT + TAB_BAR_FAB_OVERFLOW + insets.bottom + extra;
}
