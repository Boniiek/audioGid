import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  PanResponder,
  Animated,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import Map from '../components/Map';
import { theme } from '../../theme';
import CheckboxUnchecked from '../../assets/images/icons/chevron-right-icon.svg';
import CheckboxChecked from '../../assets/images/icons/chevron-left-blue.svg';
import Settings from '../../assets/images/icons/settings.svg';
import Previous from '../../assets/images/icons/previous.svg';
import Minus15 from '../../assets/images/icons/minus15.svg';
import Play from '../../assets/images/icons/play.svg';
import PlayWhite from '../../assets/images/icons/play-white.svg';
import Plus15 from '../../assets/images/icons/plus15.svg';
import Next from '../../assets/images/icons/next.svg';
import Like from '../../assets/images/icons/like.svg';
import Line from '../../assets/images/icons/line.svg';
import Pause from '../../assets/images/icons/pause.svg';
import PauseWhite from '../../assets/images/icons/pause-white.svg';
import Download from '../../assets/images/icons/download.svg';
import ShowText from '../../assets/images/icons/text-btn.svg';
import VolumeOn from '../../assets/images/icons/volume_on.svg';
import VolumeOff from '../../assets/images/icons/volume_off.svg';
import AIoutlined from '../../assets/images/icons/ai-outlined-icon.svg';
import AIoutlinedBlue from '../../assets/images/icons/ai-outlined-blue.svg';
import AIfiled from '../../assets/images/icons/ai-filled-icon.svg';
import { VolumeManager } from 'react-native-volume-manager';
import Slider from '@react-native-community/slider';
import LinearGradient from 'react-native-linear-gradient';
import TrackPlayer, { State, useProgress, usePlaybackState, PlaybackTrackChangedEvent, Event } from 'react-native-track-player';
import { Suggest  } from 'react-native-yamap';
// import { GeoFigureType } from 'react-native-yamap/build/Search';
import {ClassTimer} from './test.tsx';
import { Geocoder } from 'react-native-yamap';
import base64 from 'base-64';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addToFavorites, removeFromFavorites, saveAudioToHistory, isFavorite } from '../../services/AudioService.ts';
import { useFocusEffect } from '@react-navigation/native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import Animated from 'react-native-reanimated';

Geocoder.init('500f7015-58c8-477a-aa0c-556ea02c2d9e');

type AudioData = {
  path: string;
  text: string;
  title: string;
};

type Preference = {
  id: string;
  name: string;
  selected: boolean;
};

interface HomeScreenProps {
  navigation: any;
  route?: {
    params?: {
      removedFavoriteId?: string;
    };
  };
}

function HomeScreen({ navigation, route }: HomeScreenProps): React.JSX.Element {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0);
  const [volumeListenerInitialized, setVolumeListenerInitialized] = useState(false);
  const [containerHeight] = useState<number | 'auto'>('auto');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [previousVolume, setPreviousVolume] = useState<number>(volume);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const myInstance = new ClassTimer();
  const [audioText, setAudioText] = useState<string>('');
  const [audioTextTitle, setAudioTextTitle] = useState<string>('');
  const [showTextManually, setShowTextManually] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasContent, setHasContent] = useState<boolean>(false);
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [isTrackEnded, setIsTrackEnded] = useState(false);
  const [isGeneratingNewAudio, setIsGeneratingNewAudio] = useState<boolean>(false);
  const [isAudioFavorite, setIsAudioFavorite] = useState(false);
  const [currentAudioId, setCurrentAudioId] = useState<string | null>(null);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [preferences, setPreferences] = useState<Preference[]>([
    { id: '1', name: 'Парки', selected: true },
    { id: '2', name: 'Монументы', selected: true },
    { id: '3', name: 'Музеи', selected: true },
    { id: '4', name: 'Памятники', selected: true },
    { id: '5', name: 'Рестораны', selected: true },
    { id: '6', name: 'Кафе', selected: true },
    { id: '7', name: 'Театры', selected: true },
    { id: '8', name: 'Галереи', selected: true },
    { id: '9', name: 'Соборы', selected: true },
    { id: '10', name: 'Мосты', selected: true },
    { id: '11', name: 'Площади', selected: true },
    { id: '12', name: 'Улицы', selected: true },
  ]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [playlist, setPlaylist] = useState<AudioData[]>([]);

  const togglePreference = (id: string) => {
    setPreferences(prev => 
      prev.map(item => 
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };
  
  const progress = useProgress();
  const playbackState = usePlaybackState();

  const getToken = async (): Promise<string | null> => {
    try {
        const token = await AsyncStorage.getItem('token');
        return token;
    } catch (error) {
        console.error('Ошибка при получении токена:', error);
        return null;
    }
  };

  const { position, duration } = useProgress();

  useEffect(() => {
    if (duration > 0 && position >= duration) {
      setIsTrackEnded(true);
      setIsPlaying(false);
    }
  }, [position, duration]);

  useEffect(() => {
    if (playbackState.state === State.Playing) {
      setIsPlaying(true);
    } else if (playbackState.state === State.Paused || playbackState.state === State.Stopped) {
      setIsPlaying(false);
    }
  }, [playbackState.state]);

  const fetchAllAudio = async (): Promise<AudioData[]> => {
    try {
      setIsLoading(true);
      const jwtToken = await getToken();
      if (!jwtToken) throw new Error('Токен отсутствует');

      const response = await fetch('http://109.172.31.90:8080/api/process-json-noauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': jwtToken },
        body: JSON.stringify({ json_data: await myInstance.fetchData() }),
      });
      
      if (!response.ok) throw new Error(`Ошибка: ${response.status}`);
      const data = await response.json();

      if (!Array.isArray(data)) throw new Error('Ответ сервера не является массивом');
      if (data.length === 0) throw new Error('Нет данных в ответе сервера');

      const validItems = data.filter(item => item.audio !== null);
      if (validItems.length === 0) throw new Error('Нет доступного аудио');

      const audioItems: AudioData[] = [];
      
      for (const item of validItems) {
        const filePath = `${RNFS.DocumentDirectoryPath}/audio_${Date.now()}_${item.place_name}.mp3`;
        await RNFS.writeFile(filePath, item.audio, 'base64');
        
        audioItems.push({
          path: filePath,
          text: item.response,
          title: item.place_name
        });
      }

      return audioItems;
    } catch (error) {
      console.error('Ошибка загрузки аудио:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const initializePlaylist = async () => {
    try {
      const audioItems = await fetchAllAudio();
      setPlaylist(audioItems);
      setCurrentTrackIndex(0);
      return audioItems;
    } catch (error) {
      console.error('Ошибка при создании плейлиста:', error);
      return [];
    }
  };

  const playCurrentTrack = async () => {
    if (playlist.length === 0 || currentTrackIndex >= playlist.length) return;

    const currentTrack = playlist[currentTrackIndex];
    
    try {
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: `audio-track-${currentTrackIndex}`,
        url: `file://${currentTrack.path}`,
        title: currentTrack.title,
        artist: 'Аудиогид',
      });
      
      setAudioText(currentTrack.text);
      setAudioTextTitle(currentTrack.title);
      
      const newItem = await saveAudioToHistory({
        path: currentTrack.path,
        text: currentTrack.text,
        title: currentTrack.title
      });
      
      setCurrentAudioId(newItem.id);
      const favoriteStatus = await isFavorite(newItem.id);
      setIsAudioFavorite(favoriteStatus);
      
      await TrackPlayer.play();
      setIsPlaying(true);
      setIsTrackEnded(false);
    } catch (error) {
      console.error('Ошибка воспроизведения:', error);
    }
  };

  const handleTrackEnd = async () => {
    if (currentTrackIndex < playlist.length - 1) {
      // Переход к следующему треку
      setCurrentTrackIndex(prev => prev + 1);
    } else {
      // Окончание плейлиста
      setIsPlaying(false);
      setIsTrackEnded(true);
    }
  };

  useEffect(() => {
    if (playlist.length > 0 && currentTrackIndex < playlist.length) {
      playCurrentTrack();
    }
  }, [currentTrackIndex, playlist]);

  useEffect(() => {
    const listener = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      handleTrackEnd();
    });
  
    return () => {
      listener.remove();
    };
  }, [currentTrackIndex, playlist]);
  
  const playAudio = async (): Promise<void> => {
    if (isPlaying && !isTrackEnded) {
      await pauseAudio();
      return;
    }

    try {
      if (isTrackEnded) {
        const audioItems = await initializePlaylist();
        if (audioItems.length > 0) {
          setCurrentTrackIndex(0);
        }
        return;
      }

      if (playlist.length === 0) {
        const audioItems = await initializePlaylist();
        if (audioItems.length > 0) {
          setCurrentTrackIndex(0);
        }
        return;
      }

      await TrackPlayer.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Ошибка воспроизведения:', error);
    }
  };

  const generateNewAudio = async () => {
    try {
      setIsGeneratingNewAudio(true);
      const audioItems = await initializePlaylist();
      if (audioItems.length > 0) {
        setCurrentTrackIndex(0);
      }
    } catch (error) {
      console.error('Ошибка генерации нового аудио:', error);
    } finally {
      setIsGeneratingNewAudio(false);
    }
  };

  const pauseAudio = async (): Promise<void> => {
    await TrackPlayer.pause();
    setIsPlaying(false);
  };

  const playPauseAudio = async (): Promise<void> => {
    if (isPlaying) {
      await pauseAudio();
    } else {
      await playAudio();
    }
  };

  const seekAudio = async (value: number): Promise<void> => {
    await TrackPlayer.seekTo(value);
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const forward15 = async (): Promise<void> => {
    const position = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(position + 15);
  };

  const backward15 = async (): Promise<void> => {
    const position = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(Math.max(position - 15, 0));
  };

  const moveToStart = async (): Promise<void> => {
    if (playlist.length === 0) return;
  
    const position = await TrackPlayer.getPosition();
    if (position < 3) {
      if (currentTrackIndex > 0) {
        setCurrentTrackIndex(currentTrackIndex - 1);
      } else {
        await TrackPlayer.seekTo(0);
      }
    } else {
      await TrackPlayer.seekTo(0);
    }
  };

  const moveToEnd = async (): Promise<void> => {
    if (playlist.length === 0) return;
  
    if (currentTrackIndex < playlist.length - 1) {
      setCurrentTrackIndex(currentTrackIndex + 1);
    } else {
      const duration = await TrackPlayer.getDuration();
      await TrackPlayer.seekTo(duration);
    }
  };

  const muteVolume = async (): Promise<void> => {
    if (volume !== 0) {
      setPreviousVolume(volume);
    }
    setVolume(0);
    await VolumeManager.setVolume(0);
  };

  const unmuteVolume = async (): Promise<void> => {
    if (previousVolume !== 0) {
      setVolume(previousVolume);
      await VolumeManager.setVolume(previousVolume);
    } else {
      const defaultVolume = 0.5;
      setVolume(defaultVolume);
      await VolumeManager.setVolume(defaultVolume);
    }
  };

  const volumeChange = (newVolume: number): void => {
    setVolume(newVolume);
    VolumeManager.setVolume(newVolume);
  };

  const pan = useRef(new Animated.Value(80)).current;
  // открытие слайдера меню 
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          Animated.timing(pan, {
            toValue: 80 - gestureState.dy,
            duration: 50,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < 0) {
          Animated.timing(pan, {
            toValue: 410,
            duration: 300,
            useNativeDriver: false,
          }).start(() => setIsExpanded(true));
        } else {
          Animated.timing(pan, {
            toValue: 80,
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            setIsExpanded(false);
            setAudioText('');
            setAudioTextTitle('');
          });
        }
      },
    })
  ).current;

  const textDisplayManually = () => {
    setShowTextManually(!showTextManually);
  };

  const generateContent = async () => {
    try {
      const audioItems = await fetchAllAudio();
      
      if (audioItems.length === 0) {
        Alert.alert('Аудио недоступно', 'Для этого места нет аудиозаписей.');
        return;
      }

      setPlaylist(audioItems);
      setCurrentTrackIndex(0);
      setHasContent(true);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось загрузить данные');
    }
};

  useEffect(() => {
    const setupVolumeManager = async () => {
      try {
        const currentVolume = await VolumeManager.getVolume();
        setVolume(currentVolume.volume || 0);
        
        if (!volumeListenerInitialized) {
          const listener = VolumeManager.addVolumeListener((result) => {
            setVolume(result.volume);
          });
          setVolumeListenerInitialized(true);
          
          return () => {
            listener.remove();
          };
        }
      } catch (error) {
        console.error('Ошибка при получении громкости:', error);
      }
    };
  
    setupVolumeManager();
  }, [volumeListenerInitialized]);

  const toggleFavorite = async () => {
    if (!currentAudioId) return;
    
    try {
      if (isAudioFavorite) {
        await removeFromFavorites(currentAudioId);
      } else {
        await addToFavorites(currentAudioId);
      }
      setIsAudioFavorite(!isAudioFavorite);
    } catch (error) {
      console.error('Ошибка при обновлении избранного:', error);
    }
  };

  useEffect(() => {
    const updateFavoriteStatus = async () => {
      if (currentAudioId) {
        const status = await isFavorite(currentAudioId);
        setIsAudioFavorite(status);
      }
    };
  
    const unsubscribe = navigation.addListener('favoritesUpdated', updateFavoriteStatus);
  
    updateFavoriteStatus();
  
    return unsubscribe;
  }, [navigation, currentAudioId]);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (currentAudioId) {
        const status = await isFavorite(currentAudioId);
        setIsAudioFavorite(status);
      }
    };
    checkFavoriteStatus();
  }, [currentAudioId]);

  useEffect(() => {
    if (route?.params?.removedFavoriteId && currentAudioId === route.params.removedFavoriteId) {
      setIsAudioFavorite(false);
      navigation.setParams({ removedFavoriteId: undefined });
    }
  }, [route?.params?.removedFavoriteId, currentAudioId]);

  useFocusEffect(
    React.useCallback(() => {
      if (currentAudioId) {
        const checkStatus = async () => {
          const status = await isFavorite(currentAudioId);
          setIsAudioFavorite(status);
        };
        checkStatus();
      }
    }, [currentAudioId])
  );

  const PreferencesModal = () => {
    const renderItem = ({ item, drag, isActive }: {
      item: Preference;
      drag: () => void;
      isActive: boolean;
    }) => {
      return (
        <Animated.View>
          <TouchableOpacity
            style={[
              styles.preferenceItem,
              isActive && styles.activePreferenceItem
            ]}
            onLongPress={drag}
            onPress={() => togglePreference(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.dragHandle}>
              <Line width={24} height={24} color={theme.colors.text2} />
            </View>
            {/* {item.selected ? (
              <CheckboxChecked width={24} height={24} />
            ) : (
              <CheckboxUnchecked width={24} height={24} />
            )} */}
            <Text style={styles.preferenceText}>{item.name}</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    };
  
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPreferencesModal}
        onRequestClose={() => setShowPreferencesModal(false)}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Настройте предпочтения</Text>
              <Text style={styles.modalSubtitle}>Удерживайте и перемещайте для изменения порядка</Text>
              
              <DraggableFlatList
                data={preferences}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                onDragEnd={({ data }) => setPreferences(data)}
                contentContainerStyle={styles.preferencesList}
                activationDistance={10}
                autoscrollSpeed={50}
              />
              
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowPreferencesModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Готово</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GestureHandlerRootView>
      </Modal>
    );
  };

  const GenerateContentSection = () => (
    <View style={styles.generateContentContainer}>
      <TouchableOpacity 
        onPress={generateContent}
        disabled={isLoading}
        style={styles.generateButton}
      >
        <LinearGradient colors={['#2196F3', '#13578D']} style={styles.generateButtonGradient}>
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <AIoutlined width={24} height={24} />
              <Text style={styles.generateButtonText}>Сгенерировать рассказ</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.preferencesButton}
        onPress={() => setShowPreferencesModal(true)}
      >
        <Settings width={24} height={24} color="#2196F3" />
      </TouchableOpacity>
    </View>
  );

  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const PlaylistModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showPlaylistModal}
      onRequestClose={() => setShowPlaylistModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.playlistModalContainer}>
          <Text style={styles.playlistTitle}>Плейлист</Text>
          
          <FlatList
            data={playlist}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({item, index}) => (
              <TouchableOpacity 
                style={[
                  styles.playlistItem,
                  index === currentTrackIndex && styles.currentTrackItem
                ]}
                onPress={() => {
                  setCurrentTrackIndex(index);
                  setShowPlaylistModal(false);
                }}
              >
                <Text style={styles.playlistItemText}>
                  {item.title || `Трек ${index + 1}`}
                </Text>
                {index === currentTrackIndex && isPlaying && (
                  <View style={styles.playingIndicator}>
                    <View style={styles.playingBar} />
                    <View style={styles.playingBar} />
                    <View style={styles.playingBar} />
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
          
          <TouchableOpacity 
            style={styles.closePlaylistButton}
            onPress={() => setShowPlaylistModal(false)}
          >
            <Text style={styles.closePlaylistButtonText}>Закрыть</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={styles.container}>
          <View style={styles.mapComponent}>
            <Map />
          </View>

          <TouchableOpacity 
            style={styles.playlistButton}
            onPress={() => setShowPlaylistModal(true)}
          >
            <Text style={styles.playlistButtonText}>Плейлист</Text>
          </TouchableOpacity>


          {hasContent && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                setHasContent(false);
                setAudioText('');
                setAudioTextTitle('');
                setAudioUrl(null);
                TrackPlayer.reset();
                setIsPlaying(false);
              }}
            >
              <Text style={styles.backButtonText}>Назад</Text>
            </TouchableOpacity>
          )}

          {!hasContent ? (
            <GenerateContentSection />
          ) : (
            <>
              {isExpanded ? (
                <View style={[styles.bottomContainer, { height: containerHeight }]}>
                  {showTextManually && audioText ? (
                    <View style={styles.textContentContainer}>
                      <Animated.View style={styles.swipeElement} {...panResponder.panHandlers}>
                        <Line width={24} height={24} color={theme.colors.text} />
                      </Animated.View>
                      <View style={styles.textContentMainContainer}>
                        <View style={styles.textContentTopContainer}>
                          <Text style={styles.textContentTitle}>{audioTextTitle}</Text>
                          <TouchableOpacity onPress={textDisplayManually}>
                            <ShowText width={24} height={24} color={theme.colors.text} />
                          </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.textScrollView}>
                          <Text style={styles.audioText}>{audioText}</Text>
                        </ScrollView>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Animated.View style={styles.swipeElement} {...panResponder.panHandlers}>
                        <Line width={24} height={24} color={theme.colors.text} />
                      </Animated.View>
                      <View style={styles.bottomSubTopContainerExpanded}>
                        <Text style={styles.timeText}>{formatTime(progress.position)}</Text>
                        <Slider
                          style={styles.sliderTrack}
                          minimumValue={0}
                          maximumValue={progress.duration}
                          value={progress.position}
                          onSlidingComplete={seekAudio}
                          minimumTrackTintColor="#2196F3"
                          maximumTrackTintColor="#13578D"
                          thumbTintColor="#2196F3"
                          // thumbImage={require('../../assets/images/icons/thumbImage.png')}
                        />
                        <Text style={styles.timeText}>{formatTime(progress.duration)}</Text>
                      </View>
                      <View style={styles.bottomSubMidContainerExpanded}>
                        <TouchableOpacity onPress={moveToStart}>
                          <Previous width={24} height={24} color={isPlaying ? theme.colors.text : theme.colors.text2} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={backward15}>
                          <Minus15 width={24} height={24} color={isPlaying ? theme.colors.text : theme.colors.text2} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.playPauseButtonSubContainer} onPress={playPauseAudio} disabled={isGeneratingNewAudio}>
                          <LinearGradient colors={['#2196F3', '#13578D']} style={styles.playPauseButtonContainer}>
                            {isGeneratingNewAudio ? (
                              <ActivityIndicator size="large" color="#2196F3" />
                            ) : (
                              <LinearGradient colors={['#2196F3', '#13578D']} style={styles.playPauseButtonContainer}>
                                {isPlaying && !isTrackEnded ? (
                                  <PauseWhite width={24} height={24} color={theme.colors.text} />
                                ) : (
                                  <PlayWhite width={24} height={24} color={theme.colors.text} />
                                )}
                              </LinearGradient>
                            )}
                          </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={forward15}>
                          <Plus15 width={24} height={24} color={isPlaying ? theme.colors.text : theme.colors.text2} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={moveToEnd}>
                          <Next width={24} height={24} color={isPlaying ? theme.colors.text : theme.colors.text2} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.bottomSubBotContainerExpanded}>
                        <View style={styles.bottomSubBotContainerLeftExpanded}>
                        <TouchableOpacity onPress={toggleFavorite}>
                          <Like 
                            width={24} 
                            height={24} 
                            color={isAudioFavorite ? theme.colors.primary : (isPlaying ? theme.colors.text : theme.colors.text2)} 
                            fill={isAudioFavorite ? theme.colors.primary : 'none'}
                          />
                        </TouchableOpacity>
                          <TouchableOpacity>
                            <Settings width={24} height={24} color={theme.colors.text} />
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity 
                          onPress={generateNewAudio}
                          disabled={isGeneratingNewAudio}
                        >
                          {isGeneratingNewAudio ? (
                            // <ActivityIndicator size="small" color="#2196F3" />
                            <AIoutlinedBlue width={24} height={24} />
                          ) : (
                            <AIoutlinedBlue width={24} height={24} />
                          )}
                        </TouchableOpacity>
                        <View style={styles.bottomSubBotContainerRightExpanded}>
                          <TouchableOpacity onPress={textDisplayManually}>
                            <ShowText width={24} height={24} color={theme.colors.text} />
                          </TouchableOpacity>
                          <TouchableOpacity>
                            <Download width={24} height={24} color={isPlaying ? theme.colors.text : theme.colors.text2} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.sliderVolumeContainer}>
                        <TouchableOpacity onPress={muteVolume}>
                          <VolumeOff width={24} height={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Slider
                          style={styles.sliderVolume}
                          minimumValue={0}
                          maximumValue={1}
                          value={volume}
                          onValueChange={volumeChange}
                          minimumTrackTintColor="#2196F3"
                          maximumTrackTintColor="#13578D"
                          thumbTintColor="#2196F3"
                          // thumbImage={require('../../assets/images/icons/thumbVolumeImage.png')}
                        />
                        <TouchableOpacity onPress={unmuteVolume}>
                          <VolumeOn width={24} height={24} color={theme.colors.text} />
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              ) : (
                <View style={[styles.bottomContainer, { height: containerHeight }]}>
                  <Animated.View style={styles.swipeElement} {...panResponder.panHandlers}>
                    <Line width={24} height={24} color={theme.colors.text} />
                  </Animated.View>
                  <View style={styles.bottomSubContainer}>
                    <TouchableOpacity style={styles.bottomSubContainerLeft}>
                      <Settings width={24} height={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <View style={styles.bottomSubContainerCenter}>
                      <TouchableOpacity onPress={moveToStart}>
                        <Previous width={24} height={24} color={isPlaying ? theme.colors.text : theme.colors.text2} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={backward15}>
                        <Minus15 width={24} height={24} color={isPlaying ? theme.colors.text : theme.colors.text2} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={playPauseAudio}>
                        {isPlaying ? (
                          <Pause width={24} height={24} color={theme.colors.text} />
                        ) : (
                          <Play width={24} height={24} color={theme.colors.text} />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={forward15}>
                        <Plus15 width={24} height={24} color={isPlaying ? theme.colors.text : theme.colors.text2} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={moveToEnd}>
                        <Next width={24} height={24} color={isPlaying ? theme.colors.text : theme.colors.text2} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={toggleFavorite}>
                      <Like 
                        width={24} 
                        height={24} 
                        color={isAudioFavorite ? theme.colors.primary : (isPlaying ? theme.colors.text : theme.colors.text2)} 
                        fill={isAudioFavorite ? theme.colors.primary : 'none'}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
          <PlaylistModal />
          <PreferencesModal />
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    fontFamily: theme.fonts.regular,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapComponent: {
    flex: 1,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingLeft: 16,
    paddingRight: 16,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 80,
    // minHeight: 240,
    maxHeight: 410,
    // borderBottomWidth: 1,
    // borderBottomColor: theme.colors.text2,
  },
  swipeElement: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  textContentContainer: {
    flex: 1,
    // paddingBottom: 16,
  },
  textContentMainContainer: {
    flexDirection: 'column',
  },
  textContentTopContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textContentTitle: {
    fontWeight: 600,
    fontSize: 22,
    color: theme.colors.text,
  },
  textScrollView: {
    // flex: 1,
    marginTop: 16,
    marginBottom: 16,
  },
  audioText: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
  },
  bottomSubContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bottomSubContainerLeft: {},
  bottomSubContainerCenter: {
    flexDirection: 'row',
    gap: 20,
  },
  bottomSubContainerRight: {},
  sliderVolumeContainer: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 20,
  },
  sliderVolume: {
    flex: 1,
    height: 20,
  },
  bottomSubTopContainerExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sliderTrack: {
    flex: 1,
    height: 20,
  },
  timeText: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
  },
  bottomSubMidContainerExpanded: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 13,
    paddingRight: 13,
  },
  playPauseButtonContainer: {
    width: 76,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
    marginLeft: 12,
    marginRight: 12,
  },
  playPauseButtonSubContainer: {
    zIndex: 50,
    alignItems: 'center',
  },
  bottomSubBotContainerExpanded: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 13,
    paddingRight: 13,
    marginTop: 16,
  },
  bottomSubBotContainerLeftExpanded: {
    flexDirection: 'row',
    gap: 40,
  },
  bottomSubBotContainerRightExpanded: {
    flexDirection: 'row',
    gap: 40,
  },



  generateContentContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  generateButton: {
    flex: 1,
    marginRight: 10,
  },
  generateButtonGradient: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  preferencesButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    // maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: theme.colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.text2,
    textAlign: 'center',
    marginBottom: 20,
  },
  preferencesList: {
    paddingBottom: 20,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.text2,
    backgroundColor: 'white',
  },
  // activePreferenceItem: {
  //   backgroundColor: '#f5f5f5',
  // },
  activePreferenceItem: {
    backgroundColor: '#f5f5f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ scale: 1.01 }],
  },
  dragHandle: {
    marginRight: 12,
    opacity: 0.5,
  },
  preferenceText: {
    marginLeft: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  modalCloseButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  backButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
  },


  //стили к плейлисту:
  playlistButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  playlistButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
  },
  playlistModalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  playlistTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: theme.colors.text,
  },
  playlistItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentTrackItem: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  playlistItemText: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    marginLeft: 10,
  },
  playingBar: {
    width: 3,
    height: 15,
    backgroundColor: '#2196F3',
    marginHorizontal: 2,
  },
  closePlaylistButton: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#2196F3',
    borderRadius: 20,
    alignItems: 'center',
  },
  closePlaylistButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default HomeScreen;