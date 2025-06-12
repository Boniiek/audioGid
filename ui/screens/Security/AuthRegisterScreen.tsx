import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import ChevronLeftBlueIcon from '../../../assets/images/icons/chevron-left-blue.svg';
import EmailIcon from '../../../assets/images/icons/email-icon.svg';
import LockIcon from '../../../assets/images/icons/lock-icon.svg';
import ProfileIcon from '../../../assets/images/icons/profile-icon.svg';
import { theme } from '../../../theme';
import { register } from '../../components/Api';

interface AuthRegisterScreenProps {
  onRegister?: () => void;
  navigation: any;
}

const AuthRegisterScreen: React.FC<AuthRegisterScreenProps> = ({ onRegister, navigation }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const registerFunc = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Ошибка', 'Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      const response = await register(email, username, password);
      console.log('Ответ сервера:', response);
      Alert.alert('Успешная регистрация');
      if (onRegister) {
        onRegister();
      }
      navigation.navigate('Auth');
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      Alert.alert('Ошибка', 'Не удалось зарегистрироваться');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#2E7D32', '#1B5E20']} style={styles.containerBackground}>
      </LinearGradient>
      <View style={styles.containerRegister}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Auth')}>
          <ChevronLeftBlueIcon width={20} height={20} style={styles.chevronLeftBlue} />
          <Text style={styles.backButtonText}>Назад</Text>
        </TouchableOpacity>
        <Text style={styles.titleRegister}>Регистрация</Text>
        <View style={styles.inputEmailContainer}>
          <EmailIcon width={24} height={24} />
          <TextInput
            style={styles.input}
            placeholder="Введите email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputUsernameContainer}>
          <ProfileIcon width={24} height={24} />
          <TextInput
            style={styles.input}
            placeholder="Введите никнейм"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputPasswordContainer}>
          <LockIcon width={24} height={24} />
          <TextInput
            style={styles.input}
            placeholder="Введите пароль"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        <View style={styles.inputPasswordRepeatContainer}>
          <LockIcon width={24} height={24} />
          <TextInput
            style={styles.input}
            placeholder="Подтвердите пароль"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>
        <TouchableOpacity onPress={!loading ? registerFunc : undefined}>
          <LinearGradient colors={['#2E7D32', '#1B5E20']} style={styles.buttonRegister}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonRegisterText}>Зарегистрироваться</Text>
          )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerBackground: {
    flex: 1,
    justifyContent: 'center',
  },
  containerRegister: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 34,
    backgroundColor: '#EBEFEE',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  backButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevronLeftBlue: {
    marginTop: 2,
  },
  backButtonText: {
    color: '#2E7D32',
    fontSize: 16,
  },
  titleRegister: {
    color: '#2E7D32',
    fontSize: 32,
    fontWeight: 600,
    lineHeight: 32,
    marginTop: 30,
  },
  inputEmailContainer: {
    marginTop: 40,
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputUsernameContainer: {
    marginTop: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputPasswordContainer: {
    marginTop: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputPasswordRepeatContainer: {
    marginTop: 20,
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    paddingHorizontal: 10,
    borderRadius: 20,
    height: 52,
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    color: theme.colors.text2,
  },
  buttonRegister: { 
    padding: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 86,
    height: 52,
  },
  buttonRegisterText: {
    color: '#fff',
    fontFamily: theme.fonts.bold,
    fontSize: 20,
  },
});

export default AuthRegisterScreen;
