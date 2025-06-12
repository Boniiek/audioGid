import React from 'react';
import { Alert, TouchableOpacity, View, StyleSheet, SafeAreaView, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProp } from '@react-navigation/native';

interface LogoutButtonProps {
  navigation: NavigationProp<any>;
  onLogout: () => void;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ onLogout }) => {
    const logoutFunc = async () => {
      try {
        await AsyncStorage.removeItem('token');
        onLogout();
      } catch (error) {
        Alert.alert('Ошибка', 'Не удалось выйти из аккаунта');
      }
    };
  
    return (
      <TouchableOpacity onPress={logoutFunc}>
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </TouchableOpacity>
    )
  };
  
  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    logoutText: {
      fontSize: 16,
      color: '#FFFFFF',
    },
  });

export default LogoutButton;