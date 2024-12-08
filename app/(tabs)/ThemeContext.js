import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

const themes = {
  light: {
    background: '#FFFFFF',
    text: '#000000',
  },
  dark: {
    background: '#000000',
    text: '#FFFFFF',
  },
};

export const ThemeProvider = ({ children }) => {
  const systemTheme = useColorScheme();
  const [theme, setTheme] = useState(themes[systemTheme] || themes.light);

  useEffect(() => {
    setTheme(themes[systemTheme] || themes.light);
  }, [systemTheme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
