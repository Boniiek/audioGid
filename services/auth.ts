import { jwtDecode } from 'jwt-decode';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface JwtPayload {
  exp: number;
}

// Проверяет, истек ли токен
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    return true; // Если токен невалидный, считаем его истекшим
  }
};

// Получает токен и проверяет его валидность
export const getValidToken = async (): Promise<string | null> => {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    return null;
  }

  if (isTokenExpired(token)) {
    await AsyncStorage.removeItem('token');
    return null;
  }

  return token;
};
