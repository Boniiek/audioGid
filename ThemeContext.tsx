import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme, DarkTheme } from '@react-navigation/native';

type ThemeType = 'light' | 'dark' | 'system';
type AppTheme = typeof DefaultTheme & {
  colors: typeof DefaultTheme['colors'] & {
    secondary: string;
    card: string;
    border: string;
  };
};

const lightTheme: AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2E7D32',
    background: '#FFFFFF',
    card: '#F8F8F8',
    text: '#000000',
    secondary: '#666666',
    border: '#EEEEEE',
  },
};

const darkTheme: AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#2E7D32',
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    secondary: '#AAAAAA',
    border: '#333333',
  },
};

type ThemeContextType = {
  theme: AppTheme;
  themeType: ThemeType;
  setThemeType: (type: ThemeType) => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  themeType: 'light',
  setThemeType: () => {},
  isDark: false,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeType, setThemeType] = useState<ThemeType>('system');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('@app_theme');
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeType(savedTheme as ThemeType);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      let systemTheme: ColorSchemeName = Appearance.getColorScheme();
      setIsDark(themeType === 'dark' || (themeType === 'system' && systemTheme === 'dark'));
    };

    updateTheme();
    AsyncStorage.setItem('@app_theme', themeType);

    const subscription = Appearance.addChangeListener(updateTheme);
    return () => subscription.remove();
  }, [themeType]);

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, themeType, setThemeType, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);