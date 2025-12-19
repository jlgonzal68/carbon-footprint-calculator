/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const tintColorLight = "#2E7D32";
const tintColorDark = "#66BB6A";

export const Colors = {
  light: {
    text: "#212121",
    textSecondary: "#757575",
    textDisabled: "#BDBDBD",
    background: "#FFFFFF",
    backgroundSecondary: "#F5F5F5",
    card: "#FFFFFF",
    tint: tintColorLight,
    secondary: "#1976D2",
    accent: "#F57C00",
    success: "#2E7D32",
    warning: "#F57C00",
    error: "#D32F2F",
    icon: "#757575",
    tabIconDefault: "#757575",
    tabIconSelected: tintColorLight,
    border: "#E0E0E0",
    shadow: "rgba(0, 0, 0, 0.1)",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#B0B0B0",
    textDisabled: "#666666",
    background: "#121212",
    backgroundSecondary: "#1E1E1E",
    card: "#1E1E1E",
    tint: tintColorDark,
    secondary: "#64B5F6",
    accent: "#FFB74D",
    success: "#66BB6A",
    warning: "#FFB74D",
    error: "#EF5350",
    icon: "#B0B0B0",
    tabIconDefault: "#B0B0B0",
    tabIconSelected: tintColorDark,
    border: "#333333",
    shadow: "rgba(0, 0, 0, 0.3)",
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
