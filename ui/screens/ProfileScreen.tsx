import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ImageLibraryOptions, launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import AddPhotoIcon from '../../assets/images/icons/add-photo-icon.svg';
import ChevronRight from '../../assets/images/icons/chevron-right-icon.svg';
import EditIcon from '../../assets/images/icons/edit-icon.svg';
import { getFavoritesCount, getHistoryCount } from '../../services/AudioService';
import { theme } from '../../theme';
import LogoutButton from './Security/LogoutButton';

interface ProfileScreenProps {
  navigation: any;
  onLogout: () => void;
}

// interface CarouselItem {
//   id: number;
//   imageUrl: string;
// }

function ProfileScreen({ navigation, onLogout }: ProfileScreenProps): React.JSX.Element {

  const [avatar, setAvatar] = useState<{ uri: string } | null>(null);
  // const [activeSlide, setActiveSlide] = useState<number>(0);
  // const { width } = useWindowDimensions();
  const [user, setUser] = useState<{username: string; email: string} | null>(null);
  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  const [historyCount, setHistoryCount] = useState<number>(0);

  const loadCounts = async () => {
    try {
      const [favCount, histCount] = await Promise.all([
        getFavoritesCount(),
        getHistoryCount()
      ]);
      setFavoritesCount(favCount);
      setHistoryCount(histCount);
    } catch (error) {
      console.error('Ошибка при загрузке счетчиков:', error);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    };
    loadUser();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadCounts();
    }, [])
  );

  // const carouselItems: CarouselItem[] = [
  //   { id: 1, imageUrl: 'https://cdn1.flamp.ru/5cfc249baad12b9824c7751ad357724a.jpg' },
  //   { id: 2, imageUrl: 'https://picture.portalbilet.ru/origin/b3b680c7-56bc-47d8-87f1-9f67a42398ae.jpeg' },
  //   { id: 3, imageUrl: 'https://nnao.ru/wp-content/uploads/2024/02/Chehov-1.jpg' },
  // ];

  const selectImage = () => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 76,
      maxWidth: 76,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorMessage) {
        console.log('ImagePicker Error: ', response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        const source = { uri: response.assets[0].uri! };
        setAvatar(source);
      }
    });
  };

  // const renderCarouselItem = ({ item, index }: { item: CarouselItem; index: number }): React.ReactElement => {
  //   return (
  //     <View style={[styles.carouselItem, { zIndex: carouselItems.length - index }]}>
  //       <Image source={{ uri: item.imageUrl }} style={styles.carouselImage} />
  //     </View>
  //   );
  // };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient 
        colors={['#2E7D32', '#1B5E20', '#0D3B1E']} 
        style={styles.containerBackground}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.safeAreaContainer} />
          <View style={styles.header}>
            <TouchableOpacity onPress={selectImage}>
              <View style={styles.photoContainer}>
                {avatar ? (
                  <Image source={avatar} style={styles.avatar} />
                ) : (
                  <AddPhotoIcon width={24} height={24} />
                )}
              </View>
            </TouchableOpacity>
            <Text style={styles.profileUsername}>{user?.username || 'Username'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'email'}</Text>
            <TouchableOpacity style={styles.editProfileContainer}>
              <EditIcon width={24} height={24}/>
              <Text style={styles.profileEditText}>Редактировать профиль</Text>
            </TouchableOpacity>
          </View>

          {/* <View style={styles.recentlyVisitedContainer}>
            <TouchableOpacity style={styles.recentlyVisitedTitleContainer}>
              <Text style={styles.recentlyVisitedTitle}>
                Недавно вы посещали
              </Text>
              <ChevronRight width={20} height={20} style={styles.recentlyChevronRight} />
            </TouchableOpacity>
            <View style={styles.recentlyVisitedCarouselContainer}>
              <Carousel
                data={carouselItems}
                renderItem={renderCarouselItem}
                sliderWidth={width}
                itemWidth={width - 60}
                layout={'default'}
                loop={true}
                autoplay={true}
                autoplayInterval={5000}
                onSnapToItem={(index) => setActiveSlide(index)}
                activeSlideAlignment={'start'}
                firstItem={0}
                // inactiveSlideOpacity={0}
              />
              <Pagination
                dotsLength={carouselItems.length}
                activeDotIndex={activeSlide}
                containerStyle={styles.paginationContainer}
                dotStyle={styles.paginationDot}
                inactiveDotOpacity={0.4}
                inactiveDotScale={0.6}
              />
            </View>
          </View> */}

          <View style={styles.toolsListContainer}>
            <TouchableOpacity style={styles.listItemFirstContainer} onPress={() => navigation.navigate('History')}>
              <View style={styles.listItemLeft}>
                <Text style={styles.listItemText}>История</Text>
                {historyCount > 0 && (
                  <View style={styles.counterContainer}>
                    <Text style={styles.counterText}>{historyCount}</Text>
                  </View>
                )}
              </View>
              <ChevronRight width={20} height={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.listItemContainer} onPress={() => navigation.navigate('Favourites')}>
              <View style={styles.listItemLeft}>
                <Text style={styles.listItemText}>Избранное</Text>
                {favoritesCount > 0 && (
                  <View style={styles.counterContainer}>
                    <Text style={styles.counterText}>{favoritesCount}</Text>
                  </View>
                )}
              </View>
              <ChevronRight width={20} height={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.listItemContainer} onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.listItemText}>Настройки</Text>
              <ChevronRight width={20} height={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.listItemContainer} onPress={() => navigation.navigate('Subscription')}>
              <Text style={styles.listItemText}>Управление подпиской</Text>
              <ChevronRight width={20} height={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.listItemContainer} onPress={() => navigation.navigate('Support')}>
              <Text style={styles.listItemText}>Поддержка</Text>
              <ChevronRight width={20} height={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.listItemContainer} onPress={() => navigation.navigate('About')}>
              <View style={styles.listItemLeft}>
                <Text style={styles.listItemText}>О приложении</Text>
                <Text style={styles.versionText}>v1.0.0</Text>
              </View>
              <ChevronRight width={20} height={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.listItemLastContainer} onPress={() => navigation.navigate('PrivacyPolicy')}>
              <Text style={styles.listItemText}>Политика конфиденциальности</Text>
              <ChevronRight width={20} height={20} />
            </TouchableOpacity>
          </View>
          <View style={styles.bottomContainer}>
            <View style={styles.logoutButton}>
              <LogoutButton navigation={navigation} onLogout={onLogout} />
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  containerBackground: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  safeAreaContainer: {
    position: 'absolute',
    top: 0,
    height: 44,
    width: '100%',
  },
  header: {
    backgroundColor: '#F1E8D9',
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    width: '100%',
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  photoContainer: {
    width: 76,
    height: 76,
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileUsername: {
    fontFamily: theme.fonts.bold,
    fontSize: 24,
    color: '#2E7D32',
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileEmail: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  profileEditText: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 40,
  },
  editProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recentlyVisitedContainer: {
    marginLeft: 16,
    marginTop: 20,
  },
  recentlyVisitedTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentlyVisitedTitle: {
    fontSize: 18,
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
  },
  recentlyChevronRight: {
    marginTop: 3,
  },
  recentlyVisitedCarouselContainer: {
    marginTop: 8,
  },
  carouselItem: {
    width: '100%',
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  paginationContainer: {
    paddingVertical: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  toolsListContainer: {
    width: 382,
    backgroundColor: '#F1E8D9',
    borderRadius: 20,
    marginLeft: 16,
    marginRight: 16,
    marginTop: 20,
    paddingLeft: 16,
    flexDirection: 'column',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  listItemFirstContainer: {
    borderBottomWidth: 1,
    borderColor: '#E6D5C3',
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    paddingTop: 16,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listItemContainer: {
    borderBottomWidth: 1,
    borderColor: '#E6D5C3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  listItemLastContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    paddingBottom: 16,
    paddingTop: 16,
  },
  listItemText: {
    color: '#2E7D32',
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    fontWeight: '500',
  },
  counterContainer: {
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  counterText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
  versionText: {
    color: '#666666',
    fontSize: 12,
  },
  bottomContainer: {
    flexDirection: 'column',
    alignContent: 'center',
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  logoutButton: {
    width: 200,
    height: 48,
  },
});

export default ProfileScreen;