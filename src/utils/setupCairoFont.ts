import { Text, TextInput, StyleSheet, TextStyle } from 'react-native';
import { FONTS } from '../constants/typography';

function familyFromWeight(weight?: TextStyle['fontWeight']): string {
    const w = weight == null ? '' : String(weight);
    if (w === '700' || w === 'bold' || w === '800' || w === '900') return FONTS.bold;
    if (w === '600' || w === '500' || w === 'semiBold') return FONTS.semiBold;
    return FONTS.regular;
}

function patchTextComponent(Component: typeof Text | typeof TextInput) {
    const originalRender = (Component as any).render;
    if (!originalRender || (Component as any).__cairoPatched) return;

    (Component as any).render = function patchedRender(props: any, ref: any) {
        const flat = StyleSheet.flatten(props.style) || {};
        const fontFamily = flat.fontFamily || familyFromWeight(flat.fontWeight);
        const style = flat.fontWeight && !flat.fontFamily
            ? [props.style, { fontFamily, fontWeight: undefined as TextStyle['fontWeight'] }]
            : [{ fontFamily }, props.style];
        return originalRender.call(this, { ...props, style }, ref);
    };
    (Component as any).__cairoPatched = true;
}

/** Map fontWeight → Cairo and apply regular as the default everywhere */
export function setupCairoFont() {
    patchTextComponent(Text);
    patchTextComponent(TextInput);
}
