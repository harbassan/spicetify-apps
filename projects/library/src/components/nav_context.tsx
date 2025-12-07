import React from 'react';

interface Navigation {
  current: string;
  navigate: (route: string) => void;
  goBack: () => void;
  getParam: () => string | undefined;
};

export const NavigationContext = React.createContext<Navigation | null>(null);

export const NavigationProvider = ({children }: { children: React.ReactNode }) => {
  const [current, setCurrent] = React.useState<string>(undefined!);
  const [history, setHistory] = React.useState<string[]>([]);

  const navigate = React.useCallback((newRoute: string) => {
    setHistory((prev) => (newRoute !== current ? [...prev, current] : prev));
    if (newRoute !== current) setCurrent(newRoute);
  }, [current]);

  const goBack = React.useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const last = newHistory.pop()!;
      setCurrent(last);
      return newHistory;
    });
  }, []);

  const getParam = React.useCallback(() => {
    const [, param] = current.split("/") || [];
    return param;
  }, [current]);

  return (
    <NavigationContext.Provider value={{ current, navigate, goBack, getParam }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const ctx = React.useContext(NavigationContext);
  return ctx as Navigation;
};