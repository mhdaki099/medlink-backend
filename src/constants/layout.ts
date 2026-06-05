import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Patient tab bar content area */
export const TAB_BAR_BASE_HEIGHT = 85;

/** Pharmacy, warehouse, lab, doctor tab bar content area */
export const PROVIDER_TAB_BAR_BASE_HEIGHT = 70;

/** FAB floats above the bar */
export const TAB_BAR_FAB_OVERFLOW = 28;

/** Default bottom padding for scroll content under patient floating tab bar */
export const TAB_BAR_CLEARANCE = TAB_BAR_BASE_HEIGHT + TAB_BAR_FAB_OVERFLOW + 24;

/** Static fallback for provider tabs (prefer useProviderTabBarClearance) */
export const PROVIDER_TAB_BAR_CLEARANCE = PROVIDER_TAB_BAR_BASE_HEIGHT + TAB_BAR_FAB_OVERFLOW + 24;

/** Bottom offset for floating action buttons on tab screens */
export const TAB_BAR_FAB_BOTTOM = TAB_BAR_CLEARANCE + 12;

/** Dynamic clearance including device safe area (patient tabs) */
export function useTabBarClearance(extra = 12): number {
    const insets = useSafeAreaInsets();
    return TAB_BAR_BASE_HEIGHT + TAB_BAR_FAB_OVERFLOW + insets.bottom + extra;
}

/** Dynamic clearance for pharmacy/warehouse/lab/doctor tab screens */
export function useProviderTabBarClearance(extra = 24): number {
    const insets = useSafeAreaInsets();
    return PROVIDER_TAB_BAR_BASE_HEIGHT + TAB_BAR_FAB_OVERFLOW + insets.bottom + extra;
}

/** Bottom padding when tab bar is hidden (sub-screens) */
export function useSubscreenBottomPadding(extra = 24): number {
    const insets = useSafeAreaInsets();
    return insets.bottom + extra;
}

/** FAB position when tab bar is hidden */
export function useSubscreenFabBottom(extra = 24): number {
    const insets = useSafeAreaInsets();
    return insets.bottom + extra;
}
