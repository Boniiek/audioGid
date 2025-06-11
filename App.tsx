import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Navigate from './Navigate';
import { setupPlayer } from './setupPlayer';
import { ThemeProvider } from './ThemeContext';

const App: React.FC = () => {
  useEffect(() => {
    setupPlayer().then(() => {
      console.log('Player is ready');
    });
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <Navigate />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;