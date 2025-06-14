import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, Route, useTheme } from '@react-navigation/native';
import { Text } from '@react-navigation/elements';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './ui/screens/HomeScreen';
import NavigatorScreen from './ui/screens/NavigatorScreen';
import ProfileScreen from './ui/screens/ProfileScreen';
import AuthLoginScreen from './ui/screens/Security/AuthLoginScreen';
import AuthRegisterScreen from './ui/screens/Security/AuthRegisterScreen';
import HistoryScreen from './ui/screens/ProfileTools/HistoryScreen';
import FavouritesScreen from './ui/screens/ProfileTools/FavouritesScreen';
import SettingsScreen from './ui/screens/ProfileTools/SettingsScreen';
import SubscriptionScreen from './ui/screens/ProfileTools/SubscriptionScreen';
import SupportScreen from './ui/screens/ProfileTools/SupportScreen';
import AboutScreen from './ui/screens/ProfileTools/AboutScreen';
import PrivacyPolicyScreen from './ui/screens/ProfileTools/PrivacyPolicyScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { theme } from './theme';
import HomeIcon from './assets/images/icons/home.svg';
import HomeIconOutlined from './assets/images/icons/home-outlined.svg';
import SearchIcon from './assets/images/icons/search.svg';
import SearchIconOutlined from './assets/images/icons/search-outline.svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileIcon from './assets/images/icons/profile-icon.svg'
import ProfileIconOutlined from './assets/images/icons/profile-outlined.svg'
import { getValidToken } from './services/auth';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MyTabBar: React.FC<any> = ({ state, descriptors, navigation }) => {
  // const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {state.routes.map((route: Route<string>, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          if (!isFocused) {
            navigation.navigate(route.name);
          }
        };

        let IconName: React.ElementType = HomeIcon;
        if (route.name === 'Главная') {
          IconName = isFocused ? HomeIcon : HomeIconOutlined;
        } else if (route.name === 'Поиск') {
          IconName = isFocused ? SearchIcon : SearchIconOutlined;
        } else if (route.name === 'Профиль') {
          IconName = isFocused ? ProfileIcon : ProfileIconOutlined;
        }

        return (
          <View key={route.key} style={styles.button} onTouchStart={onPress}>
            <IconName width={24} height={24} />
            <Text style={{ color: isFocused ? theme.colors.primary : theme.colors.text2 }}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const ProfileStack = createNativeStackNavigator();

export const ProfileStackNavigator = ({ onLogout }: { onLogout: () => void }) => {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain">
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="History" component={HistoryScreen} />
      <ProfileStack.Screen name="Favourites" component={FavouritesScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="Subscription" component={SubscriptionScreen} />
      <ProfileStack.Screen name="Support" component={SupportScreen} />
      <ProfileStack.Screen name="About" component={AboutScreen} />
      <ProfileStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    </ProfileStack.Navigator>
  );
};

export const MainApp: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  return (
    <Tab.Navigator
      tabBar={(props) => <MyTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Главная" component={HomeScreen} />
      <Tab.Screen name="Поиск" component={NavigatorScreen} />
      <Tab.Screen name="Профиль">
        {(props) => <ProfileStackNavigator {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const Navigate: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const checkAuth = async () => {
  //     const token = await AsyncStorage.getItem('token');
  //     setIsAuthenticated(!!token);
  //     setLoading(false);
  //   };

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getValidToken();
      setIsAuthenticated(!!token);
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = async (token: string) => {
    await AsyncStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Auth">
              {(props) => <AuthLoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>
            <Stack.Screen name="AuthRegister">
              {(props) => <AuthRegisterScreen {...props} onRegister={() => props.navigation.navigate('Auth')} />}
            </Stack.Screen>
          </>
        ) : (
          <Stack.Screen name="MainApp">
            {(props) => <MainApp {...props} onLogout={handleLogout} />}
          </Stack.Screen>
        )}
        {/* <Stack.Screen name="About" component={AboutScreen} /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    // backgroundColor: theme.colors.background,
    // backgroundColor: '#FFF',
    backgroundColor: '#F1E8D9',
    // opacity: 0.2,
    // borderTopWidth: 1,
    // borderTopColor: theme.colors.text2,
    borderTopWidth: 1,
    // borderTopColor: '#EEEEEE',
    borderTopColor: '#CCC3B2',
  },
  button: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
  },
});

export default Navigate;
