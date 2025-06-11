/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable curly */
/* eslint-disable @typescript-eslint/no-unused-vars */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PermissionsAndroid, Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import RNFS from 'react-native-fs';
import Geolocation from 'react-native-geolocation-service';
import LinearGradient from 'react-native-linear-gradient';
import { accelerometer, SensorTypes, setUpdateIntervalForType } from 'react-native-sensors';
import TrackPlayer, { Event, usePlaybackState, useProgress } from 'react-native-track-player';
import { VolumeManager } from 'react-native-volume-manager';
import { Geocoder } from 'react-native-yamap';
import AIoutlined from '../../assets/images/icons/ai-outlined-icon.svg';
import Download from '../../assets/images/icons/download.svg';
import Like from '../../assets/images/icons/like.svg';
import Line from '../../assets/images/icons/line.svg';
import Minus15 from '../../assets/images/icons/minus15.svg';
import Next from '../../assets/images/icons/next.svg';
import PauseWhite from '../../assets/images/icons/pause-white.svg';
import PlayWhite from '../../assets/images/icons/play-white.svg';
import Plus15 from '../../assets/images/icons/plus15.svg';
import Previous from '../../assets/images/icons/previous.svg';
import Settings from '../../assets/images/icons/settings.svg';
import ShowText from '../../assets/images/icons/text-btn.svg';
import VolumeOff from '../../assets/images/icons/volume_off.svg';
import VolumeOn from '../../assets/images/icons/volume_on.svg';
import { addToFavorites, isFavorite, removeFromFavorites, saveAudioToHistory } from '../../services/AudioService.ts';
import { theme } from '../../theme';
import Map from '../components/Map';
import { ClassTimer, Coordinates } from './test.tsx';

Geocoder.init('500f7015-58c8-477a-aa0c-556ea02c2d9e');

type AudioData = {
  path: string;
  text: string;
  title: string;
};

// type Preference = {
//   id: string;
//   name: string;
//   selected: boolean;
// };

interface HomeScreenProps {
  navigation: any;
  route?: {
    params?: {
      removedFavoriteId?: string;
    };
  };
}

function HomeScreen({ navigation, route }: HomeScreenProps): React.JSX.Element {
  type Position = {
    latitude: number;
    longitude: number;
  };

  type TransportMode = 'pedestrian' | 'scooter' | 'car';

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0);
  const [volumeListenerInitialized, setVolumeListenerInitialized] = useState(false);
  const [containerHeight] = useState<number | 'auto'>('auto');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [previousVolume, setPreviousVolume] = useState<number>(volume);
  const [parentPosition, setParentPosition] = useState<{ lat: number; lon: number } | null>(null);
  const myInstance = useMemo(() => new ClassTimer(), []);
  const [audioText, setAudioText] = useState<string>('');
  const [audioTextTitle, setAudioTextTitle] = useState<string>('');
  const [showTextManually, setShowTextManually] = useState<boolean>(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasContent, setHasContent] = useState<boolean>(false);
  const [isTrackEnded, setIsTrackEnded] = useState(false);
  const [isGeneratingNewAudio, setIsGeneratingNewAudio] = useState<boolean>(false);
  const [isAudioFavorite, setIsAudioFavorite] = useState(false);
  const [currentAudioId, setCurrentAudioId] = useState<string | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [playlist, setPlaylist] = useState<AudioData[]>([]);

  const playCurrentTrack = useCallback(async () => {
    if (playlist.length === 0 || currentTrackIndex >= playlist.length) return;

    const currentTrack = playlist[currentTrackIndex];

    try {
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: `audio-track-${currentTrackIndex}-${Date.now()}`,
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
  }, [playlist, currentTrackIndex, setAudioText, setAudioTextTitle, setCurrentAudioId, setIsAudioFavorite, setIsPlaying, setIsTrackEnded]);

  const handleTrackEnd = useCallback(async () => {
    try {
      if (currentTrackIndex < playlist.length - 1) {
        await TrackPlayer.reset();
        setCurrentTrackIndex(prev => prev + 1);
      } else {
        setIsTrackEnded(true);
        await TrackPlayer.pause();
      }
    } catch (error) {
      console.error('Ошибка переключения трека:', error);
    }
  }, [currentTrackIndex, playlist.length, setCurrentTrackIndex, setIsTrackEnded]);

  // Состояния для отслеживания
  const [isActive, setIsActive] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>('pedestrian');
  const [status, setStatus] = useState('Нажмите "Начать отслеживание"');

  // Референсы
  const zoneCenterRef = useRef<Position | null>(null);
  const positionHistoryRef = useRef<Position[]>([]);
  const gpsWatchIdRef = useRef<number | null>(null);
  const accelSubscriptionRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Настройки режимов
  const MODE_SETTINGS = {
    pedestrian: { maxSpeed: 2, radius: 500 },
    scooter: { maxSpeed: 8, radius: 1500 },
    car: { maxSpeed: 20, radius: 3000 },
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

  // 1. Запрос разрешений
  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);
      return granted['android.permission.ACCESS_FINE_LOCATION'] === 'granted';
    }
    return true;
  }, []);

  // 2. Инициализация WebSocket
  const initWebSocket = useCallback(async() => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('WebSocket уже подключен');
        return;
      }

      wsRef.current = new WebSocket('ws://109.172.31.90:8080/ws');

      wsRef.current.onopen = () => {
        console.log('WebSocket подключен');
        setStatus('WebSocket подключен');
      };

      wsRef.current.onclose = (event) => {
        console.log('Код закрытия:', event.code, 'Причина:', event.reason);
        setStatus('WebSocket отключен');
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket ошибка:', error);
        setStatus('Ошибка подключения к серверу');
      };

      wsRef.current.onmessage = async (event) => {
        console.log('Получено аудио от сервера');
        try {
          const data = JSON.parse(event.data);

          const filePath = `${RNFS.DocumentDirectoryPath}/audio_${Date.now()}.mp3`;
          await RNFS.writeFile(filePath, data.content, 'base64');

          const newAudioItem: AudioData = {
            path: filePath,
            text: data.text || 'Описание отсутствует',
            title: data.title || 'Без названия'
          };

          setPlaylist(prevPlaylist => {
            const newPlaylist = [...prevPlaylist, newAudioItem];

            if (prevPlaylist.length === 0 && !isPlaying) {
              setCurrentTrackIndex(0);
              playCurrentTrack();
            }

            return newPlaylist;
          });
        } catch (error) {
          console.error('Ошибка при обработке аудио:', error);
        }
      };
    } catch (error) {
      console.error('Ошибка инициализации WebSocket:', error);
      setStatus('Ошибка инициализации WebSocket');
    }
  }, [isPlaying, playCurrentTrack]);

  // 3. Отправка данных на сервер
  const sendLocationData = useCallback(async () => {
    if (!currentPosition || !parentPosition) {
        return false;
    }

    const requestCoords: Coordinates = {
      lat: parentPosition.lat,
      lon: parentPosition.lon,
    };

    try {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        await initWebSocket();
      }

      const checkSendData = await myInstance.fetchData(requestCoords);

      if (checkSendData && checkSendData.length > 0) {
        const dataToSend = checkSendData[0];
        // Проверяем структуру данных перед отправкой
        if (!dataToSend.id || !('lat' in dataToSend) || !('lon' in dataToSend) || !dataToSend.type) {
          console.error('Некорректная структура данных:', dataToSend);
          return false;
        }

        console.log('Отправляем данные:', dataToSend);
        try {
          wsRef.current?.send(JSON.stringify(dataToSend));
          // Ждем подтверждения отправки
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (sendError) {
          console.error('Ошибка при отправке данных:', sendError);
          return false;
        }
      }

      setStatus(`Данные отправлены (${new Date().toLocaleTimeString()})`);
      return true;
    } catch (error) {
      console.error('Ошибка отправки:', error);
      setStatus('Ошибка отправки данных');
      return false;
    }
  }, [currentPosition, parentPosition, initWebSocket, myInstance]);

  // 4. Запуск отслеживания
  const startTracking = useCallback(async () => {
    Geolocation.getCurrentPosition(
      pos => console.log('Тестовая позиция:', pos),
      err => console.error('Тестовая ошибка:', err)
    );

    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude, speed: gpsSpeed } = position.coords;
        const newPos = { latitude, longitude };
        console.log('координаты есть');
        console.log(position.coords);

        setCurrentPosition(newPos);
        positionHistoryRef.current = [...positionHistoryRef.current.slice(-5), newPos];

        if (gpsSpeed && gpsSpeed > 0) {
          setSpeed(gpsSpeed);
        }
      },
      error => {
        console.error('Ошибка геолокации:', error);
        setStatus('Ошибка получения местоположения');
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 5,
      }
    );

    const success = await sendLocationData();
    if (!success) {
        return;
    }

    setUpdateIntervalForType(SensorTypes.accelerometer, 1000);
    accelSubscriptionRef.current = accelerometer.subscribe(({ x, y, z }) => {
      const acceleration = Math.sqrt(x * x + y * y + z * z);
      if (acceleration > 1.5) {
        setSpeed(prev => Math.min(prev + 0.5, 25));
      }
    });

    setIsActive(true);
    setStatus('Отслеживание активно');
  }, [sendLocationData]);

  // 5. Остановка отслеживания
  const stopTracking = useCallback(() => {
    if (gpsWatchIdRef.current) {
      Geolocation.clearWatch(gpsWatchIdRef.current);
      gpsWatchIdRef.current = null;
    }

    if (accelSubscriptionRef.current) {
      accelSubscriptionRef.current.unsubscribe();
      accelSubscriptionRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    zoneCenterRef.current = null;
    setIsActive(false);
    setStatus('Отслеживание остановлено');
  }, []);

  // 6. Проверка выхода за границы зоны
  const checkZoneBoundary = useCallback((pos: Position, center: Position, radius: number) => {
    const toRad = (val: number) => val * Math.PI / 180;
    const R = 6371e3;
    const dLat = toRad(pos.latitude - center.latitude);
    const dLon = toRad(pos.longitude - center.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(center.latitude)) * Math.cos(toRad(pos.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) > radius;
  }, []);

  const handlePositionUpdate = (newPosition: { lat: number; lon: number }) => {
    setParentPosition(newPosition);
  };

  const generateContent = async () => {
    try {
      setIsLoading(true);
      setIsGeneratingNewAudio(true);

      // Инициализируем WebSocket соединение
      await initWebSocket();

      // Запускаем отслеживание местоположения
      await startTracking();

      setHasContent(true);
    } catch (error) {
      console.error('Ошибка при генерации контента:', error);
      Alert.alert('Ошибка', 'Не удалось начать генерацию аудио');
    } finally {
      setIsLoading(false);
      setIsGeneratingNewAudio(false);
    }
  };

  useEffect(() => {
    if (playlist.length > 0 && currentTrackIndex < playlist.length) {
      playCurrentTrack();
    }
  }, [currentTrackIndex, playlist, playCurrentTrack]);

  useEffect(() => {
    const listener = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
      handleTrackEnd();
    });

    return () => {
      listener.remove();
    };
  }, [currentTrackIndex, playlist, handleTrackEnd]);

  const playAudio = async () => {
    if (isPlaying) {
      await pauseAudio();
      stopTracking();
      return;
    }

    if (isTrackEnded || playlist.length === 0) {
      await generateContent();
    }

    await TrackPlayer.play();
    setIsPlaying(true);
    startTracking();
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

  useEffect(() => {
    if (route?.params?.removedFavoriteId && currentAudioId === route.params.removedFavoriteId) {
      setIsAudioFavorite(false);
      navigation.setParams({ removedFavoriteId: undefined });
    }
  }, [route?.params?.removedFavoriteId, currentAudioId, navigation]);

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

  const textDisplayManually = () => {
    setShowTextManually(!showTextManually);
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
              <Text style={styles.generateButtonText}>Начать рассказ</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const wasPlayingBeforeOpen = useRef(false);

  const handleOpenPlaylist = async () => {
    try {
      wasPlayingBeforeOpen.current = isPlaying;
      // Ставим аудио на паузу, если оно играет
      if (isPlaying) {
        await TrackPlayer.pause();
        setIsPlaying(false);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Затем открываем плейлист
      setShowPlaylistModal(true);
      
    } catch (error) {
      console.error('Ошибка при открытии плейлиста:', error);
    }
  };

  const handleClosePlaylist = async () => {
    try {
      // Закрываем плейлист
      setShowPlaylistModal(false);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Проверяем, было ли аудио на паузе перед открытием плейлиста
      if (wasPlayingBeforeOpen.current) {
        await TrackPlayer.play();
        setIsPlaying(true);
      }
      
    } catch (error) {
      console.error('Ошибка при возобновлении воспроизведения:', error);
    }
  };

  const PlaylistModal = () => {
    const [internalVisible, setInternalVisible] = useState(false);
  
    useEffect(() => {
      if (showPlaylistModal) {
        setInternalVisible(true);
      } else {
        const timer = setTimeout(() => setInternalVisible(false), 300);
        return () => clearTimeout(timer);
      }
    }, [showPlaylistModal]);
  
    const handleItemPress = async (index: number) => {
      try {
        setCurrentTrackIndex(index);
        setShowPlaylistModal(false);
        await TrackPlayer.reset();
      } catch (error) {
        console.error('Ошибка при выборе трека:', error);
      }
    };
  
    if (!internalVisible) return null;
  
    return (
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
              keyExtractor={(item, index) => `track-${index}`}
              renderItem={({ item, index }) => (
                <PlaylistItem 
                  item={item}
                  index={index}
                  isCurrent={index === currentTrackIndex}
                  isPlaying={false}
                  onPress={() => handleItemPress(index)}
                />
              )}
              extraData={currentTrackIndex}
            />
            
            <TouchableOpacity 
              style={styles.closePlaylistButton}
              onPress={handleClosePlaylist}
            >
              <Text style={styles.closePlaylistButtonText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const PlaylistItem = React.memo(({ item, index, isCurrent, isPlaying, onPress }: {
    item: AudioData;
    index: number;
    isCurrent: boolean;
    isPlaying: boolean;
    onPress: () => void;
  }) => {
    return (
      <TouchableOpacity 
        style={[
          styles.playlistItem,
          isCurrent && styles.currentTrackItem
        ]}
        onPress={onPress}
      >
        <Text style={styles.playlistItemText}>
          {item.title || `Трек ${index + 1}`}
        </Text>
        {isCurrent && (
          <View style={styles.playingIndicator}>
            {isPlaying ? (
              <PauseWhite width={16} height={16} color="#2196F3" />
            ) : (
              <PlayWhite width={16} height={16} color="#2196F3" />
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={styles.container}>
          <View style={styles.mapComponent}>
            <Map onPositionChange={handlePositionUpdate}/>
          </View>

          <TouchableOpacity 
            style={styles.playlistButton}
            onPress={handleOpenPlaylist}
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
                TrackPlayer.reset();
                setIsPlaying(false);
                stopTracking();
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
                      <View style={styles.swipeElement}>
                        <Line width={24} height={24} color={theme.colors.text} />
                      </View>
                      <View style={styles.textContentMainContainer}>
                        <View style={styles.textContentTopContainer}>
                          <Text style={styles.textContentTitle}>{audioTextTitle}</Text>
                          <TouchableOpacity onPress={textDisplayManually}>
                            <ShowText width={24} height={24} color={theme.colors.text} />
                          </TouchableOpacity>
                        </View>
                        <View style={{flexGrow: 1}}>
                          <ScrollView
                            style={styles.textScrollView}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={true}
                          >
                            <Text style={styles.audioText}>{audioText}</Text>
                          </ScrollView>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={styles.swipeElement}>
                        <Line width={24} height={24} color={theme.colors.text} />
                      </View>
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
                  <View style={styles.swipeElement}>
                    <Line width={24} height={24} color={theme.colors.text} />
                  </View>
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
                    />
                    <TouchableOpacity onPress={unmuteVolume}>
                      <VolumeOn width={24} height={24} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
          
          <PlaylistModal />
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

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
    maxHeight: 410,
  },
  swipeElement: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  textContentContainer: {
    flex: 1,
    height: 300,
  },
  textContentMainContainer: {
    flexGrow: 1,
    flexDirection: 'column',
  },
  textContentTopContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textContentTitle: {
    fontWeight: '600',
    fontSize: 22,
    color: theme.colors.text,
  },
  textScrollView: {
    zIndex: 100,
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  playlistModalContainer: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  playlistTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  closePlaylistButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  closePlaylistButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
});

export default HomeScreen;
