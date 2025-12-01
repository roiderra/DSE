import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Image,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';

interface TradingSetup {
  id: string;
  name: string;
  direction: DirectionState;
  stage: StageState;
  entry: EntryState;
  createdAt: string;
  updatedAt: string;
}

interface DirectionState {
  weeklyBias: 'bullish' | 'bearish' | null;
  dailyBias: 'higher' | 'lower' | 'not_sure' | null;
  pdasIdentified: boolean;
  screenshot: string | null;
  completed: boolean;
}

interface StageState {
  priceCondition: 'pd_array' | 'stops_run' | null;
  displacement: boolean;
  displacementType: 'mss' | 'fvg_cut' | null;
  noIofed: boolean;
  screenshot: string | null;
  completed: boolean;
}

interface EntryState {
  highGradeSwingPoint: boolean;
  swingPointType: 'liquidity_sweep' | 'fvg_rebalance' | null;
  oteLevel: boolean;
  oteRetracement: '0.62' | '0.705' | '0.75' | null;
  stopLossLevel: '1' | '0.9' | null;
  takeProfitLevel: '0' | '-0.28' | null;
  riskReward: string | null;
  timeZoneSelected: boolean;
  timeZone: 'LOKZ' | 'NYOKZ' | 'LCKZ' | 'NO_MANS_LAND' | null;
  screenshot: string | null;
  completed: boolean;
}

type TabType = 'direction' | 'stage' | 'entry';

const { width, height } = Dimensions.get('window');

const STORAGE_KEY = 'trading_setup_data';
const LOCK_STORAGE_KEY = 'app_lock_until';

// Функция для создания чистого setup
const createFreshSetup = (): TradingSetup => ({
  id: '',
  name: `Setup ${new Date().toLocaleDateString()}`,
  direction: {
    weeklyBias: null,
    dailyBias: null,
    pdasIdentified: false,
    screenshot: null,
    completed: false
  },
  stage: {
    priceCondition: null,
    displacement: false,
    displacementType: null,
    noIofed: false,
    screenshot: null,
    completed: false
  },
  entry: {
    highGradeSwingPoint: false,
    swingPointType: null,
    oteLevel: false,
    oteRetracement: null,
    stopLossLevel: null,
    takeProfitLevel: null,
    riskReward: null,
    timeZoneSelected: false,
    timeZone: null,
    screenshot: null,
    completed: false
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

// Добавляем интерфейс для калькулятора
interface PositionCalculator {
  deposit: string;
  riskPercent: string;
  stopLossPips: string;
  lotSize: string;
}

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabType>('direction');
  const [currentSetup, setCurrentSetup] = useState<TradingSetup>(createFreshSetup());
  const [uploadStatus, setUploadStatus] = useState<{
    direction: boolean;
    stage: boolean;
    entry: boolean;
  }>({
    direction: false,
    stage: false,
    entry: false
  });

  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [lockUntil, setLockUntil] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [calculatorModalVisible, setCalculatorModalVisible] = useState(false);
  const [calculator, setCalculator] = useState<PositionCalculator>({
    deposit: '100000',
    riskPercent: '0.5',
    stopLossPips: '',
    lotSize: '0.00',
  });

  const mainScrollRef = useRef<ScrollView>(null);
  const zoomScrollRef = useRef<ScrollView>(null);
  const lastTapRef = useRef(0);

  const scrollToTop = () => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  // Функция для расчета оставшегося времени
  const calculateTimeLeft = () => {
    if (!lockUntil) return '';
    
    const now = new Date();
    const difference = lockUntil.getTime() - now.getTime();
    
    if (difference <= 0) {
      return '00:00:00';
    }
    
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Функция для проверки и установки блокировки
  const checkAndSetLock = async (dailyBias: 'higher' | 'lower' | 'not_sure' | null) => {
    if (dailyBias === 'not_sure') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      setIsAppLocked(true);
      setLockUntil(tomorrow);
      setTimeLeft(calculateTimeLeft());
      
      await AsyncStorage.setItem(LOCK_STORAGE_KEY, tomorrow.toISOString());
    } else {
      setIsAppLocked(false);
      setLockUntil(null);
      await AsyncStorage.removeItem(LOCK_STORAGE_KEY);
    }
  };

  // Обновляем таймер каждую секунду
  useEffect(() => {
    if (isAppLocked && lockUntil) {
      const timer = setInterval(() => {
        const newTimeLeft = calculateTimeLeft();
        setTimeLeft(newTimeLeft);
        
        if (newTimeLeft === '00:00:00') {
          clearInterval(timer);
          handleLockExpired();
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isAppLocked, lockUntil]);

  // Обработка истечения блокировки
  const handleLockExpired = async () => {
    console.log('🔓 Lock expired, resetting app...');
    await AsyncStorage.multiRemove([STORAGE_KEY, LOCK_STORAGE_KEY]);
    setIsAppLocked(false);
    setLockUntil(null);
    setCurrentSetup(createFreshSetup());
    setActiveTab('direction');
  };

  // Проверяем блокировку при загрузке приложения
  useEffect(() => {
    const checkLockStatus = async () => {
      try {
        const lockUntilString = await AsyncStorage.getItem(LOCK_STORAGE_KEY);
        if (lockUntilString) {
          const lockUntilDate = new Date(lockUntilString);
          const now = new Date();
          
          if (now < lockUntilDate) {
            setIsAppLocked(true);
            setLockUntil(lockUntilDate);
            setTimeLeft(calculateTimeLeft());
          } else {
            await handleLockExpired();
          }
        }
      } catch (error) {
        console.error('Error checking lock status:', error);
      }
    };

    checkLockStatus();
  }, []);

  // Загрузка данных при запуске (только если нет блокировки)
  useEffect(() => {
    const loadSavedData = async () => {
      if (isAppLocked) return;
      
      try {
        const savedData = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          setCurrentSetup(parsedData);
          console.log('✅ Данные восстановлены из памяти');
        } else {
          console.log('📝 Данные не найдены, начинаем с чистого листа');
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
      }
    };

    loadSavedData();
  }, [isAppLocked]);

  // Сохранение данных при изменении (только если нет блокировки)
  useEffect(() => {
    const saveData = async () => {
      if (isAppLocked) return;
      
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(currentSetup));
        console.log('💾 Данные сохранены');
      } catch (error) {
        console.error('Ошибка при сохранении данных:', error);
      }
    };

    saveData();
  }, [currentSetup, isAppLocked]);

  useEffect(() => {
    scrollToTop();
  }, [activeTab]);

  const calculateRiskReward = (): string => {
    const { oteRetracement, stopLossLevel, takeProfitLevel } = currentSetup.entry;
    
    if (!oteRetracement || !stopLossLevel || !takeProfitLevel) {
      return 'N/A';
    }

    const entry = parseFloat(oteRetracement);
    const stopLoss = parseFloat(stopLossLevel);
    const takeProfit = parseFloat(takeProfitLevel);

    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(entry - takeProfit);
    
    if (risk === 0) return 'N/A';
    
    const rrRatio = (reward / risk) * 0.9;
    return rrRatio.toFixed(2) + 'R';
  };

  const getRRColor = (rr: string) => {
    if (rr === 'N/A') return '#888';
    return '#4CAF50';
  };

  const generateReport = async () => {
    try {
      if (!currentSetup.direction.completed || !currentSetup.stage.completed || !currentSetup.entry.completed) {
        Alert.alert('All Sections Required', 'Please complete Direction, Stage and Entry sections and upload screenshots for each section.');
        return;
      }

      const isAligned = (currentSetup.direction.weeklyBias === 'bullish' && currentSetup.direction.dailyBias === 'higher') ||
        (currentSetup.direction.weeklyBias === 'bearish' && currentSetup.direction.dailyBias === 'lower');

      const safe = (v: any) => (v ?? '').toString();

      const formatTimeZone = (zone: string | null) => {
        switch (zone) {
          case 'LOKZ': return 'London Open Kill Zone (LOKZ)';
          case 'NYOKZ': return 'New York Open Kill Zone (NYOKZ)';
          case 'LCKZ': return 'London Close Kill Zone (LCKZ)';
          case 'NO_MANS_LAND': return 'No Man\'s Land';
          default: return 'NOT SET';
        }
      };

      const calculatedRR = calculateRiskReward();

      const html = `
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; padding: 16px; background: #0a0a0a; color: #fff; }
          h1 { color: #00D4FF; }
          h2 { color: #00D4FF; margin-top: 24px; }
          .section { border:1px solid #333; border-radius:12px; padding:12px; margin: 12px 0; background:#121212; }
          .row { margin: 6px 0; }
          .label { color:#aaa; }
          .value { color:#fff; font-weight:600; }
          .good { color:#4CAF50; }
          .warn { color:#FF9800; }
          img { width:100%; max-height:1200px; object-fit:contain; border-radius:8px; margin-top:8px; }
        </style>
      </head>
      <body>
        <h1>Trading Setup</h1>
        
        <div class="row"><span class="label">Generated:</span> <span class="value">${new Date().toLocaleString('en-US')}</span></div>

        <h2>Direction</h2>
        <div class="section">
          <div class="row"><span class="label">Weekly Bias:</span> <span class="value">${safe(currentSetup.direction.weeklyBias)?.toUpperCase() || 'NOT SET'}</span></div>
          <div class="row"><span class="label">Daily Bias:</span> <span class="value">${safe(currentSetup.direction.dailyBias)?.toUpperCase() || 'NOT SET'}</span></div>
          <div class="row"><span class="label">PDAs Identified:</span> <span class="value">${currentSetup.direction.pdasIdentified ? 'IDENTIFIED ✓' : 'NOT IDENTIFIED ✗'}</span></div>
          <div class="row"><span class="label">Bias Alignment:</span> <span class="value ${isAligned ? 'good' : 'warn'}">${isAligned ? 'ALIGNED ✓' : 'CONFLICT ⚠'}</span></div>
          ${currentSetup.direction.screenshot ? `<img src="${currentSetup.direction.screenshot}" />` : ''}
        </div>

        <h2>Stage</h2>
        <div class="section">
          <div class="row"><span class="label">Price Condition:</span> <span class="value">${currentSetup.stage.priceCondition === 'pd_array' ? 'Price at/coming from 4H+ PD Array' : currentSetup.stage.priceCondition === 'stops_run' ? 'Stops run on PWH/PWL/PDH/PDL' : 'NOT SET'}</span></div>
          <div class="row"><span class="label">15m+ Displacement/CISOD:</span> <span class="value">${currentSetup.stage.displacement ? 'OCCURRED ✓' : 'NOT OCCURRED ✗'}</span></div>
          <div class="row"><span class="label">Displacement Type:</span> <span class="value">${currentSetup.stage.displacementType === 'mss' ? 'Market Structure Shift (MSS)' : currentSetup.stage.displacementType === 'fvg_cut' ? 'Cuts through opposing FVG(PDA)' : 'NOT SET'}</span></div>
          <div class="row"><span class="label">NO OPPOSING IOFED TRAP on 1H+:</span> <span class="value">CONFIRMED ✓</span></div>
          ${currentSetup.stage.screenshot ? `<img src="${currentSetup.stage.screenshot}" />` : ''}
        </div>

        <h2>Entry</h2>
        <div class="section">
          <div class="row"><span class="label">High Grade Swing Point:</span> <span class="value">${currentSetup.entry.highGradeSwingPoint ? 'IDENTIFIED ✓' : 'NOT IDENTIFIED ✗'}</span></div>
          <div class="row"><span class="label">Swing Point Type:</span> <span class="value">${currentSetup.entry.swingPointType === 'liquidity_sweep' ? 'Swept Liquidity' : currentSetup.entry.swingPointType === 'fvg_rebalance' ? 'Rebalanced FVG' : 'NOT SET'}</span></div>
          <div class="row"><span class="label">OTE Level:</span> <span class="value">${currentSetup.entry.oteLevel ? 'IDENTIFIED ✓' : 'NOT IDENTIFIED ✗'}</span></div>
          <div class="row"><span class="label">OTE Retracement:</span> <span class="value">${currentSetup.entry.oteRetracement || 'NOT SET'}</span></div>
          <div class="row"><span class="label">Stop Loss:</span> <span class="value">${currentSetup.entry.stopLossLevel || 'NOT SET'}</span></div>
          <div class="row"><span class="label">Take Profit:</span> <span class="value">${currentSetup.entry.takeProfitLevel || 'NOT SET'}</span></div>
          <div class="row"><span class="label">Risk-Reward:</span> <span class="value">${calculatedRR}</span></div>
          <div class="row"><span class="label">Time Zone:</span> <span class="value">${formatTimeZone(currentSetup.entry.timeZone)}</span></div>
          ${currentSetup.entry.screenshot ? `<img src="${currentSetup.entry.screenshot}" />` : ''}
        </div>
      </body>
      </html>`;

      const { uri } = await Print.printToFileAsync({ 
        html,
        width: 612,
        height: 792,
        margins: {
          left: 36,
          top: 36,
          right: 36,
          bottom: 36
        }
      });

      console.log('✅ PDF created:', uri);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Trading Report',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Error', 'Sharing function is not available on this device');
      }

      await clearAllData();
      
    } catch (e: any) {
      console.error('PDF generation error:', e);
      Alert.alert(
        'Report Generation Error', 
        'Failed to create PDF file. Please check permissions and try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleGenerateReport = async () => {
    if (isAppLocked) {
      Alert.alert(
        'App Locked',
        'The app is locked until tomorrow due to uncertain market direction.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!currentSetup.direction.completed || !currentSetup.stage.completed || !currentSetup.entry.completed) {
      Alert.alert(
        'Not All Sections Completed',
        'Please complete all sections before generating report.',
        [{ text: 'OK' }]
      );
      return;
    }

    await generateReport();
  };

  const clearAllData = async () => {
    try {
      console.log('🧹 Clearing all data...');
      await AsyncStorage.multiRemove([STORAGE_KEY, LOCK_STORAGE_KEY]);
      const freshSetup = createFreshSetup();
      setCurrentSetup(freshSetup);
      setIsAppLocked(false);
      setLockUntil(null);
      setActiveTab('direction');
      console.log('✅ All data cleared, starting fresh');
    } catch (error) {
      console.error('Error clearing data:', error);
      Alert.alert('Error', 'Failed to clear data');
    }
  };

  const handleClearData = () => {
    if (isAppLocked) {
      Alert.alert(
        'App Locked',
        'The app is locked until tomorrow due to uncertain market direction.',
        [{ text: 'OK' }]
      );
      return;
    }
    clearAllData();
  };

  const updateDirection = async (field: keyof DirectionState, value: any) => {
    if (isAppLocked) return;
    
    if (field === 'dailyBias') {
      await checkAndSetLock(value);
    }

    const newSetup = {
      ...currentSetup,
      direction: {
        ...currentSetup.direction,
        [field]: value,
        completed: checkDirectionCompleted({
          ...currentSetup.direction,
          [field]: value
        })
      },
      updatedAt: new Date().toISOString()
    };
    
    setCurrentSetup(newSetup);
  };

  const updateStage = (field: keyof StageState, value: any) => {
    if (isAppLocked) return;
    
    const newSetup = {
      ...currentSetup,
      stage: {
        ...currentSetup.stage,
        [field]: value,
        completed: checkStageCompleted({
          ...currentSetup.stage,
          [field]: value
        })
      },
      updatedAt: new Date().toISOString()
    };
    
    setCurrentSetup(newSetup);
  };

  const updateEntry = (field: keyof EntryState, value: any) => {
    if (isAppLocked) return;
    
    const newSetup = {
      ...currentSetup,
      entry: {
        ...currentSetup.entry,
        [field]: value,
        completed: checkEntryCompleted({
          ...currentSetup.entry,
          [field]: value
        })
      },
      updatedAt: new Date().toISOString()
    };
    
    setCurrentSetup(newSetup);
  };

  const checkDirectionCompleted = (direction: DirectionState): boolean => {
    return direction.weeklyBias !== null && 
           direction.dailyBias !== null &&
           direction.dailyBias !== 'not_sure' &&
           direction.pdasIdentified &&
           direction.screenshot !== null;
  };

  const checkStageCompleted = (stage: StageState): boolean => {
    return stage.priceCondition !== null && 
           stage.displacement && 
           stage.displacementType !== null &&
           stage.noIofed &&
           stage.screenshot !== null;
  };

  const checkEntryCompleted = (entry: EntryState): boolean => {
    return entry.highGradeSwingPoint && 
           entry.swingPointType !== null && 
           entry.oteLevel && 
           entry.oteRetracement !== null && 
           entry.stopLossLevel !== null && 
           entry.takeProfitLevel !== null && 
           entry.timeZoneSelected &&
           entry.timeZone !== null &&
           entry.screenshot !== null;
  };

  const isTabAccessible = (tab: TabType): boolean => {
    if (isAppLocked) return false;
    
    switch (tab) {
      case 'direction':
        return true;
      case 'stage':
        return currentSetup.direction.completed;
      case 'entry':
        return currentSetup.direction.completed && currentSetup.stage.completed;
      default:
        return false;
    }
  };

  const switchTab = (tab: TabType) => {
    if (isAppLocked) {
      Alert.alert(
        'App Locked',
        'The app is locked until tomorrow due to uncertain market direction.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isTabAccessible(tab)) {
      const requiredSections = [];
      if (tab === 'stage' && !currentSetup.direction.completed) {
        requiredSections.push('Direction');
      }
      if (tab === 'entry') {
        if (!currentSetup.direction.completed) requiredSections.push('Direction');
        if (!currentSetup.stage.completed) requiredSections.push('Stage');
      }
      
      Alert.alert(
        'Section Locked',
        `Please complete ${requiredSections.join(' and ')} section${requiredSections.length > 1 ? 's' : ''} first.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    setActiveTab(tab);
  };

  const pickImage = async (section: 'direction' | 'stage' | 'entry') => {
    if (isAppLocked) {
      Alert.alert(
        'App Locked',
        'The app is locked until tomorrow due to uncertain market direction.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "Permission to access camera roll is required to upload screenshots!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: undefined,
        quality: 0.8,
        base64: true
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        if (section === 'direction') {
          updateDirection('screenshot', base64Image);
          setUploadStatus(prev => ({ ...prev, direction: true }));
        } else if (section === 'stage') {
          updateStage('screenshot', base64Image);
          setUploadStatus(prev => ({ ...prev, stage: true }));
        } else if (section === 'entry') {
          updateEntry('screenshot', base64Image);
          setUploadStatus(prev => ({ ...prev, entry: true }));
        }
        
        setTimeout(() => {
          setUploadStatus(prev => ({ ...prev, [section]: false }));
        }, 3000);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert("Error", "Failed to upload screenshot. Please try again.");
    }
  };

  const removeImage = (section: 'direction' | 'stage' | 'entry') => {
    if (isAppLocked) {
      Alert.alert(
        'App Locked',
        'The app is locked until tomorrow due to uncertain market direction.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (section === 'direction') {
      updateDirection('screenshot', null);
    } else if (section === 'stage') {
      updateStage('screenshot', null);
    } else if (section === 'entry') {
      updateEntry('screenshot', null);
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setImageScale(prev => prev === 1 ? 2 : 1);
    }
    lastTapRef.current = now;
  };

  const resetZoom = () => {
    setImageScale(1);
    if (zoomScrollRef.current) {
      zoomScrollRef.current.scrollTo({ x: 0, y: 0, animated: true });
    }
  };

  const closeZoomModal = () => {
    resetZoom();
    setZoomedImage(null);
  };

  // Функции для калькулятора
  const calculateLotSize = () => {
    const deposit = parseFloat(calculator.deposit);
    const riskPercent = parseFloat(calculator.riskPercent);
    const stopLossPips = parseFloat(calculator.stopLossPips);

    if (isNaN(deposit) || isNaN(riskPercent) || isNaN(stopLossPips) || stopLossPips <= 0) {
      setCalculator(prev => ({ ...prev, lotSize: '0.00' }));
      return;
    }

    const riskMoney = deposit * (riskPercent / 100);
    const lotSize = riskMoney / (stopLossPips * 10);
    
    setCalculator(prev => ({ 
      ...prev, 
      lotSize: Math.max(0, lotSize).toFixed(2) 
    }));
  };

  useEffect(() => {
    if (calculatorModalVisible) {
      calculateLotSize();
    }
  }, [calculator.deposit, calculator.riskPercent, calculator.stopLossPips, calculatorModalVisible]);

  const updateCalculatorField = (field: keyof PositionCalculator, value: string) => {
    setCalculator(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearCalculator = () => {
    setCalculator({
      deposit: '100000',
      riskPercent: '0.5',
      stopLossPips: '',
      lotSize: '0.00',
    });
  };

  const openCalculator = () => {
    if (isAppLocked) {
      Alert.alert(
        'App Locked',
        'The app is locked until tomorrow due to uncertain market direction.',
        [{ text: 'OK' }]
      );
      return;
    }
    setCalculatorModalVisible(true);
  };

  const closeCalculator = () => {
    setCalculatorModalVisible(false);
  };

  const ImageUploadSection = ({ section, screenshot }: { section: 'direction' | 'stage' | 'entry'; screenshot: string | null }) => (
    <View style={styles.imageUploadSection}>
      <Text style={styles.imageUploadTitle}>📸 Chart Screenshot</Text>
      
      {uploadStatus[section] && (
        <View style={styles.uploadSuccess}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.uploadSuccessText}>Screenshot uploaded successfully!</Text>
        </View>
      )}
      
      {screenshot ? (
        <View style={styles.imageContainer}>
          <TouchableOpacity 
            style={styles.imagePreviewContainer}
            onPress={() => setZoomedImage(screenshot)}
            activeOpacity={0.8}
          >
            <Image 
              source={{ uri: screenshot }} 
              style={styles.uploadedImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <View style={styles.imageActions}>
            <TouchableOpacity
              style={styles.imageActionButton}
              onPress={() => pickImage(section)}
            >
              <Ionicons name="camera" size={16} color="#fff" />
              <Text style={styles.imageActionButtonText}>Replace</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.imageActionButton, styles.removeButton]}
              onPress={() => removeImage(section)}
            >
              <Ionicons name="trash" size={16} color="#fff" />
              <Text style={styles.imageActionButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => pickImage(section)}
        >
          <Ionicons name="camera-outline" size={32} color="#00D4FF" />
          <Text style={styles.uploadButtonText}>Upload Chart Screenshot</Text>
          <Text style={styles.uploadButtonSubtext}>Tap to select from gallery</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderTabButton = (tab: TabType, icon: string, label: string) => {
    const isActive = activeTab === tab;
    const isCompleted = tab === 'direction' ? currentSetup.direction.completed :
                      tab === 'stage' ? currentSetup.stage.completed :
                      currentSetup.entry.completed;
    const isAccessible = isTabAccessible(tab);

    return (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tabButton, 
          isActive && styles.activeTab,
          (!isAccessible || isAppLocked) && styles.lockedTab
        ]}
        onPress={() => switchTab(tab)}
        disabled={(!isAccessible && !isActive) || isAppLocked}
      >
        <View style={styles.tabContent}>
          <Ionicons 
            name={(!isAccessible && !isActive) || isAppLocked ? 'lock-closed' : icon as any} 
            size={20} 
            color={
              isAppLocked ? '#444' :
              !isAccessible && !isActive ? '#444' :
              isActive ? '#00D4FF' : 
              isCompleted ? '#4CAF50' : '#666'
            } 
          />
          <Text style={[
            styles.tabText, 
            isActive && styles.activeTabText,
            isCompleted && styles.completedTabText,
            ((!isAccessible && !isActive) || isAppLocked) && styles.lockedTabText
          ]}>
            {label}
          </Text>
          {isCompleted && !isAppLocked && (
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.checkIcon} />
          )}
          {((!isAccessible && !isActive) || isAppLocked) && (
            <Ionicons name="lock-closed" size={12} color="#444" style={styles.lockIcon} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const CheckboxItem = ({ label, checked, onPress }: { label: string; checked: boolean; onPress: (value: boolean) => void }) => (
    <TouchableOpacity style={styles.checkboxItem} onPress={() => onPress(!checked)}>
      <View style={[styles.checkbox, checked && styles.checkedBox]}>
        {checked && <Ionicons name="checkmark" size={16} color="#1a1a1a" />}
      </View>
      <Text style={[styles.checkboxLabel, checked && styles.checkedLabel]}>{label}</Text>
    </TouchableOpacity>
  );

  const OptionItem = ({ 
    label, 
    selected, 
    onPress, 
    isWarning = false 
  }: { 
    label: string; 
    selected: boolean; 
    onPress: () => void;
    isWarning?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.listOption, 
        selected && styles.selectedListOption,
        isWarning && selected && styles.warningOption
      ]}
      onPress={onPress}
    >
      <View style={styles.optionWithCheckbox}>
        <View style={[
          styles.radioButton, 
          selected && styles.selectedRadio,
          isWarning && selected && styles.warningRadio
        ]}>
          {selected && <View style={styles.radioDot} />}
        </View>
        <Text style={[
          styles.listOptionText, 
          selected && styles.selectedListOptionText,
          isWarning && styles.warningText
        ]}>
          {label}
        </Text>
        {isWarning && (
          <Ionicons name="warning" size={16} color="#FF9800" style={styles.warningIcon} />
        )}
      </View>
    </TouchableOpacity>
  );

  const LockScreen = ({ lockUntil, timeLeft }: { lockUntil: Date; timeLeft: string }) => (
    <View style={styles.lockScreen}>
      <Ionicons name="lock-closed" size={80} color="#FF9800" />
      <Text style={styles.lockTitle}>Trading Day Skipped</Text>
      
      <View style={styles.lockMessageBox}>
        <Text style={styles.lockMessageText}>
          Without a clear daily direction, the trading system cannot work effectively. Consider this a risk management decision. Take a break today.
        </Text>
      </View>

      <View style={styles.timerContainer}>
        <Text style={styles.timerLabel}>App unlocks in:</Text>
        <Text style={styles.timer}>{timeLeft}</Text>
        <Text style={styles.timerSubtext}>
          {lockUntil.toLocaleDateString()} at 00:00
        </Text>
      </View>

      <Text style={styles.lockSubtext}>
        The app will automatically reset tomorrow with a fresh setup
      </Text>
    </View>
  );

  const CalculatorModal = () => (
    <Modal
      visible={calculatorModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={closeCalculator}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.calculatorOverlay}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
      >
        <View style={styles.calculatorContainer}>
          <View style={styles.calculatorHeader}>
            <Text style={styles.calculatorTitle}>Position Size Calculator</Text>
            <Text style={styles.calculatorSubtitle}>EUR/USD (1 lot = $10 per pip)</Text>
          </View>

          <ScrollView
            style={styles.calculatorContent}
            contentContainerStyle={styles.calculatorContentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Account Balance */}
            <View style={styles.calculatorSection}>
              <Text style={styles.calculatorLabel}>Account Balance ($)</Text>
              <TextInput
                style={styles.calculatorInput}
                value={calculator.deposit}
                onChangeText={(value) => updateCalculatorField('deposit', value)}
                keyboardType="decimal-pad"
                placeholder="Enter account balance"
                placeholderTextColor="#999"
              />
            </View>

            {/* Risk Percentage */}
            <View style={styles.calculatorSection}>
              <Text style={styles.calculatorLabel}>Risk Percentage (%)</Text>
              <View style={styles.riskButtonsContainer}>
                {['0.25', '0.5', '1.0', '2.0'].map((percent) => (
                  <TouchableOpacity
                    key={percent}
                    style={[
                      styles.riskButton,
                      calculator.riskPercent === percent && styles.riskButtonSelected
                    ]}
                    onPress={() => updateCalculatorField('riskPercent', percent)}
                  >
                    <Text style={[
                      styles.riskButtonText,
                      calculator.riskPercent === percent && styles.riskButtonTextSelected
                    ]}>
                      {percent}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.calculatorInput}
                value={calculator.riskPercent}
                onChangeText={(value) => updateCalculatorField('riskPercent', value)}
                keyboardType="decimal-pad"
                placeholder="Or enter custom risk %"
                placeholderTextColor="#999"
              />
            </View>

            {/* Stop Loss */}
            <View style={styles.calculatorSection}>
              <Text style={styles.calculatorLabel}>Stop Loss (Pips)</Text>
              <TextInput
                style={styles.calculatorInput}
                value={calculator.stopLossPips}
                onChangeText={(value) => updateCalculatorField('stopLossPips', value)}
                keyboardType="decimal-pad"
                placeholder="Enter stop loss in pips"
                placeholderTextColor="#999"
              />
            </View>

            {/* Results */}
            <View style={styles.calculatorResultSection}>
              <Text style={styles.calculatorLabel}>Recommended Lot Size</Text>
              <View style={styles.lotSizeDisplay}>
                <Text style={styles.lotSizeText}>{calculator.lotSize}</Text>
                <Text style={styles.lotSizeLabel}>LOTS</Text>
              </View>

              {parseFloat(calculator.lotSize) > 0 && (
                <View style={styles.calculationDetails}>
                  <Text style={styles.detailText}>
                    Risk Amount: ${(parseFloat(calculator.deposit) * parseFloat(calculator.riskPercent) / 100).toFixed(2)}
                  </Text>
                  <Text style={styles.detailText}>
                    Risk per Pip: ${(parseFloat(calculator.lotSize) * 10).toFixed(2)}
                  </Text>
                  <Text style={styles.detailText}>
                    Total Risk: {calculator.stopLossPips} pips × ${(parseFloat(calculator.lotSize) * 10).toFixed(2)} = ${(parseFloat(calculator.stopLossPips) * parseFloat(calculator.lotSize) * 10).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.calculatorInfo}>
              <Ionicons name="information-circle" size={16} color="#00D4FF" />
              <Text style={styles.calculatorInfoText}>
                Calculation: (Balance × Risk%) ÷ (Stop Loss × 10)
              </Text>
            </View>
          </ScrollView>

          <View style={styles.calculatorActions}>
            <TouchableOpacity 
              style={[styles.calculatorButton, styles.calculatorClearButton]}
              onPress={clearCalculator}
            >
              <Ionicons name="refresh" size={20} color="#FF6B6B" />
              <Text style={styles.calculatorClearButtonText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.calculatorButton, styles.calculatorCloseButton]}
              onPress={closeCalculator}
            >
              <Ionicons name="close" size={20} color="#fff" />
              <Text style={styles.calculatorCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderDirectionSection = () => {
    const checkAlignment = () => {
      if (!currentSetup.direction.weeklyBias || !currentSetup.direction.dailyBias) return null;
      
      if (currentSetup.direction.dailyBias === 'not_sure') return false;
      
      const aligned = (currentSetup.direction.weeklyBias === 'bullish' && currentSetup.direction.dailyBias === 'higher') ||
                     (currentSetup.direction.weeklyBias === 'bearish' && currentSetup.direction.dailyBias === 'lower');
      return aligned;
    };

    const isAligned = checkAlignment();

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>DIRECTION</Text>
          <Text style={styles.sectionSubtitle}>Market structure analysis and bias identification</Text>
        </View>

        <View style={styles.checklistSection}>
          <Text style={styles.checklistTitle}>Market Structure Analysis</Text>
          <Text style={styles.checklistSubtitle}>Identify closest Monthly/Weekly/Daily PD Arrays:</Text>
          
          <CheckboxItem
            label="Closest M/W/D PDAs identified"
            checked={currentSetup.direction.pdasIdentified}
            onPress={(value) => updateDirection('pdasIdentified', value)}
          />
        </View>

        <View style={styles.checklistSection}>
          <Text style={styles.checklistTitle}>Weekly Bias</Text>
          <Text style={styles.checklistSubtitle}>Am I anticipating a bullish or bearish week?</Text>
          
          <View style={styles.optionRow}>
            {(['bullish', 'bearish'] as const).map((bias) => (
              <TouchableOpacity
                key={bias}
                style={[
                  styles.optionButton,
                  currentSetup.direction.weeklyBias === bias && styles.selectedOption,
                  bias === 'bullish' && currentSetup.direction.weeklyBias === bias && styles.bullishOption,
                  bias === 'bearish' && currentSetup.direction.weeklyBias === bias && styles.bearishOption
                ]}
                onPress={() => updateDirection('weeklyBias', bias)}
              >
                <Text style={[styles.optionText, currentSetup.direction.weeklyBias === bias && styles.selectedOptionText]}>
                  {bias.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.checklistSection}>
          <Text style={styles.checklistTitle}>Daily Bias</Text>
          <Text style={styles.checklistSubtitle}>Is today's daily candle likely to trade higher or lower?</Text>
          
          <View style={styles.optionRow}>
            {(['higher', 'lower', 'not_sure'] as const).map((direction) => (
              <TouchableOpacity
                key={direction}
                style={[
                  styles.optionButton,
                  currentSetup.direction.dailyBias === direction && styles.selectedOption,
                  direction === 'higher' && currentSetup.direction.dailyBias === direction && styles.bullishOption,
                  direction === 'lower' && currentSetup.direction.dailyBias === direction && styles.bearishOption,
                  direction === 'not_sure' && currentSetup.direction.dailyBias === direction && styles.notSureOption
                ]}
                onPress={() => updateDirection('dailyBias', direction)}
              >
                <Text style={[styles.optionText, currentSetup.direction.dailyBias === direction && styles.selectedOptionText]}>
                  {direction === 'not_sure' ? 'NOT SURE' : direction.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {currentSetup.direction.dailyBias === 'not_sure' && (
          <View style={styles.skipTradingWarning}>
            <Ionicons name="warning" size={24} color="#FF9800" />
            <View style={styles.skipTradingContent}>
              <Text style={styles.skipTradingTitle}>Skip Trading Today</Text>
              <Text style={styles.skipTradingText}>
                Without a clear daily direction, the trading system cannot work effectively. 
                The app will be locked until tomorrow as a risk management measure.
              </Text>
              {lockUntil && (
                <Text style={styles.lockTimeText}>
                  App locked until: {lockUntil.toLocaleDateString()} {lockUntil.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </Text>
              )}
            </View>
          </View>
        )}

        {currentSetup.direction.weeklyBias && currentSetup.direction.dailyBias && currentSetup.direction.dailyBias !== 'not_sure' && (
          <View style={[
            styles.alignmentWarning,
            isAligned === false ? styles.conflictWarning : styles.alignedWarning
          ]}>
            <Ionicons 
              name={isAligned === false ? 'warning' : 'checkmark-circle'} 
              size={20} 
              color={isAligned === false ? '#FF9800' : '#4CAF50'} 
            />
            <Text style={[
              styles.alignmentText,
              isAligned === false ? styles.conflictText : styles.alignedText
            ]}>
              {isAligned === false
                ? 'Daily and Weekly bias conflict carries higher risk - Review setup carefully'
                : 'Daily and Weekly bias are aligned ✓'}
            </Text>
          </View>
        )}

        <ImageUploadSection section="direction" screenshot={currentSetup.direction.screenshot} />
      </View>
    );
  };

  const renderStageSection = () => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>STAGE</Text>
        <Text style={styles.sectionSubtitle}>For the Stage I need to see these three things</Text>
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>1. Price Position Requirement</Text>
        <Text style={styles.checklistSubtitle}>Select ONE of the following conditions:</Text>
        
        <View style={styles.optionColumn}>
          <OptionItem
            label="Price is at or coming from a 4H+ PDA in line with daily Direction"
            selected={currentSetup.stage.priceCondition === 'pd_array'}
            onPress={() => updateStage('priceCondition', currentSetup.stage.priceCondition === 'pd_array' ? null : 'pd_array')}
          />

          <OptionItem
            label="Price made a stops run on PWH/PWL/PDH/PDL in line with daily Direction"
            selected={currentSetup.stage.priceCondition === 'stops_run'}
            onPress={() => updateStage('priceCondition', currentSetup.stage.priceCondition === 'stops_run' ? null : 'stops_run')}
          />
        </View>
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>2. Displacement/CISOD Confirmation</Text>
                
        <CheckboxItem
          label="15m+ displacement occurred"
          checked={currentSetup.stage.displacement}
          onPress={(value) => updateStage('displacement', value)}
        />

        {currentSetup.stage.displacement && (
          <View style={styles.displacementTypeSection}>
            <Text style={styles.optionLabel}>Displacement/CISOD Type:</Text>
            <View style={styles.optionColumn}>
              <OptionItem
                label="Market Structure Shift (MSS)"
                selected={currentSetup.stage.displacementType === 'mss'}
                onPress={() => updateStage('displacementType', currentSetup.stage.displacementType === 'mss' ? null : 'mss')}
              />

              <OptionItem
                label="Cuts through an opposing FVG(PDA)"
                selected={currentSetup.stage.displacementType === 'fvg_cut'}
                onPress={() => updateStage('displacementType', currentSetup.stage.displacementType === 'fvg_cut' ? null : 'fvg_cut')}
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>3. NO OPPOSING IOFED TRAP Confirmation</Text>
        <Text style={styles.checklistSubtitle}>Ensure there is no OPPOSING IOFED on 1H+ timeframe:</Text>
        
        <CheckboxItem
          label="NO OPPOSING IOFED TRAP on 1H+ confirmed"
          checked={currentSetup.stage.noIofed}
          onPress={(value) => updateStage('noIofed', value)}
        />

        {!currentSetup.stage.noIofed && (
          <View style={styles.iofedWarning}>
            <Ionicons name="warning" size={16} color="#FF9800" />
            <Text style={styles.iofedWarningText}>
              OPPOSING IOFED TRAP presence can invalidate the setup - Review carefully
            </Text>
          </View>
        )}
      </View>

      {currentSetup.stage.completed && (
        <View style={styles.completionSection}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          <Text style={styles.completionText}>Stage requirements met - Ready for Entry</Text>
        </View>
      )}

      <ImageUploadSection section="stage" screenshot={currentSetup.stage.screenshot} />
    </View>
  );

  const renderEntrySection = () => {
    const calculatedRR = calculateRiskReward();
    const rrColor = getRRColor(calculatedRR);

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ENTRY</Text>
          <Text style={styles.sectionSubtitle}>OTE from a high grade swing point</Text>
        </View>

        <View style={styles.checklistSection}>
          <Text style={styles.checklistTitle}>Time Zone Identified</Text>
          <Text style={styles.checklistSubtitle}>Select the Kill Zone for this setup:</Text>
          
          <CheckboxItem
            label="Time zone selected"
            checked={currentSetup.entry.timeZoneSelected}
            onPress={(value) => updateEntry('timeZoneSelected', value)}
          />

          {currentSetup.entry.timeZoneSelected && (
            <View style={styles.timeZoneSection}>
              <Text style={styles.optionLabel}>Select Kill Zone:</Text>
              <View style={styles.optionColumn}>
                <OptionItem
                  label="London Open Kill Zone (LOKZ) 2am-5am"
                  selected={currentSetup.entry.timeZone === 'LOKZ'}
                  onPress={() => updateEntry('timeZone', 'LOKZ')}
                />

                <OptionItem
                  label="New York Open Kill Zone (NYOKZ) 7am-10am"
                  selected={currentSetup.entry.timeZone === 'NYOKZ'}
                  onPress={() => updateEntry('timeZone', 'NYOKZ')}
                />

                <OptionItem
                  label="London Close Kill Zone (LCKZ) 10am-12pm"
                  selected={currentSetup.entry.timeZone === 'LCKZ'}
                  onPress={() => updateEntry('timeZone', 'LCKZ')}
                />

                <OptionItem
                  label="No Man's Land"
                  selected={currentSetup.entry.timeZone === 'NO_MANS_LAND'}
                  onPress={() => updateEntry('timeZone', 'NO_MANS_LAND')}
                  isWarning={true}
                />
              </View>
            </View>
          )}
        </View>

        {currentSetup.entry.timeZone === 'NO_MANS_LAND' && (
          <View style={styles.noMansLandWarning}>
            <Ionicons name="warning" size={20} color="#FF9800" />
            <Text style={styles.noMansLandWarningText}>
              Trading in No Man's Land carries higher risk - Review setup carefully
            </Text>
          </View>
        )}

        <View style={styles.checklistSection}>
          <Text style={styles.checklistTitle}>High Grade Swing Point</Text>
          <Text style={styles.checklistSubtitle}>A high/low that swept liquidity or rebalanced a FVG</Text>
          
          <CheckboxItem
            label="High grade swing point identified"
            checked={currentSetup.entry.highGradeSwingPoint}
            onPress={(value) => updateEntry('highGradeSwingPoint', value)}
          />

          {currentSetup.entry.highGradeSwingPoint && (
            <View style={styles.swingPointTypeSection}>
              <Text style={styles.optionLabel}>Swing Point must fulfill ONE condition:</Text>
              <View style={styles.optionColumn}>
                <OptionItem
                  label="Swept Liquidity"
                  selected={currentSetup.entry.swingPointType === 'liquidity_sweep'}
                  onPress={() => updateEntry('swingPointType', currentSetup.entry.swingPointType === 'liquidity_sweep' ? null : 'liquidity_sweep')}
                />

                <OptionItem
                  label="Rebalanced a FVG"
                  selected={currentSetup.entry.swingPointType === 'fvg_rebalance'}
                  onPress={() => updateEntry('swingPointType', currentSetup.entry.swingPointType === 'fvg_rebalance' ? null : 'fvg_rebalance')}
                />
              </View>
            </View>
          )}
        </View>

        <View style={styles.checklistSection}>
          <Text style={styles.checklistTitle}>OTE Setup</Text>
          
          <CheckboxItem
            label="OTE level identified and price approaching"
            checked={currentSetup.entry.oteLevel}
            onPress={(value) => updateEntry('oteLevel', value)}
          />
          
          <Text style={styles.optionLabel}>OTE Retracement Level:</Text>
          <View style={styles.optionRow}>
            {(['0.62', '0.705', '0.75'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.optionButton, currentSetup.entry.oteRetracement === level && styles.selectedOption]}
                onPress={() => updateEntry('oteRetracement', level)}
              >
                <Text style={[styles.optionText, currentSetup.entry.oteRetracement === level && styles.selectedOptionText]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.checklistSection}>
          <Text style={styles.checklistTitle}>Risk Management</Text>
          
          <Text style={styles.optionLabel}>Stop Loss Level:</Text>
          <View style={styles.optionRow}>
            {(['1', '0.9'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.optionButton, currentSetup.entry.stopLossLevel === level && styles.selectedOption]}
                onPress={() => updateEntry('stopLossLevel', level)}
              >
                <Text style={[styles.optionText, currentSetup.entry.stopLossLevel === level && styles.selectedOptionText]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.optionLabel}>Take Profit Level:</Text>
          <View style={styles.optionRow}>
            {(['0', '-0.28'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.optionButton, currentSetup.entry.takeProfitLevel === level && styles.selectedOption]}
                onPress={() => updateEntry('takeProfitLevel', level)}
              >
                <Text style={[styles.optionText, currentSetup.entry.takeProfitLevel === level && styles.selectedOptionText]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.optionLabel}>Risk-Reward Ratio:</Text>
          <View style={styles.rrDisplay}>
            <View style={[styles.rrDisplayBox, { backgroundColor: rrColor }]}>
              <Text style={styles.rrDisplayText}>
                {calculatedRR}
              </Text>
            </View>
            <Text style={styles.rrHelpText}>
              Calculated automatically based on Fib levels
            </Text>
          </View>
        </View>

        <View style={styles.tradingReminderSection}>
          <Text style={styles.reminderTitle}>💡 TRADING REMINDER</Text>
          <View style={styles.reminderContent}>
            <Text style={styles.reminderText}>
              <Text style={styles.reminderBold}>Aim for 1.5R+ trades</Text>
              {'\n'}Rinse and repeat
            </Text>
            <Text style={styles.reminderText}>
              <Text style={styles.reminderBold}>Entry Formula:</Text>
              {'\n'}OTE from a high grade swing point
            </Text>
          </View>
        </View>

        {currentSetup.entry.completed && (
          <View style={styles.completionSection}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.completionText}>Entry plan complete - Ready to execute</Text>
          </View>
        )}

        <ImageUploadSection section="entry" screenshot={currentSetup.entry.screenshot} />
      </View>
    );
  };

  const getTabContent = () => {
    switch (activeTab) {
      case 'direction':
        return renderDirectionSection();
      case 'stage':
        return renderStageSection();
      case 'entry':
        return renderEntrySection();
      default:
        return renderDirectionSection();
    }
  };

  // Если приложение заблокировано, показываем LockScreen
  if (isAppLocked && lockUntil) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
        <LockScreen lockUntil={lockUntil} timeLeft={timeLeft} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trading Plan</Text>
        <Text style={styles.setupName}>{currentSetup.name}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleGenerateReport}
          >
            <Ionicons name="document-text-outline" size={16} color="#00D4FF" />
            <Text style={styles.saveButtonText}>Generate Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.calculatorHeaderButton} 
            onPress={openCalculator}
          >
            <Ionicons name="calculator-outline" size={16} color="#00D4FF" />
            <Text style={styles.calculatorHeaderButtonText}>Calculator</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={handleClearData}
          >
            <Ionicons name="refresh" size={16} color="#FF6B6B" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {renderTabButton('direction', 'compass-outline', 'Direction')}
        {renderTabButton('stage', 'layers-outline', 'Stage')}
        {renderTabButton('entry', 'enter-outline', 'Entry')}
      </View>

      <View style={styles.content}>
        <ScrollView
          ref={mainScrollRef}
          style={styles.mainScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {getTabContent()}
        </ScrollView>
      </View>

      {/* Modal для увеличенного просмотра скриншотов */}
      <Modal
        visible={!!zoomedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={closeZoomModal}
      >
        <View style={styles.zoomOverlay}>
          <TouchableOpacity 
            style={styles.zoomBackground}
            activeOpacity={1}
            onPress={closeZoomModal}
          />
          <View style={styles.zoomContainer}>
            <ScrollView
              ref={zoomScrollRef}
              style={styles.zoomScrollView}
              maximumZoomScale={3}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={true}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.zoomScrollContent}
            >
              <TouchableOpacity 
                style={styles.zoomImageTouchable}
                activeOpacity={1}
                onPress={() => {
                  const now = Date.now();
                  if (now - lastTapRef.current < 300) {
                    handleDoubleTap();
                  }
                  lastTapRef.current = now;
                }}
              >
                <Image 
                  source={{ uri: zoomedImage! }} 
                  style={[
                    styles.zoomedImage,
                    { transform: [{ scale: imageScale }] }
                  ]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.closeZoomButton}
              onPress={closeZoomModal}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.zoomControls}>
              <Text style={styles.zoomHintText}>
                {imageScale > 1 ? 'Double tap to zoom out' : 'Double tap to zoom 2x'}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal для калькулятора */}
      <CalculatorModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  setupName: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#00D4FF',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  calculatorHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  calculatorHeaderButtonText: {
    color: '#00D4FF',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#FF6B6B',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#333',
  },
  tabContent: {
    alignItems: 'center',
  },
  tabText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#00D4FF',
  },
  completedTabText: {
    color: '#4CAF50',
  },
  checkIcon: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  lockIcon: {
    position: 'absolute',
    top: -2,
    left: -2,
  },
  content: {
    flex: 1,
  },
  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionHeader: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00D4FF',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#888',
  },
  checklistSection: {
    marginBottom: 24,
  },
  checklistTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  checklistSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
    lineHeight: 20,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#555',
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBox: {
    backgroundColor: '#00D4FF',
    borderColor: '#00D4FF',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 16,
    color: '#ccc',
    lineHeight: 22,
  },
  checkedLabel: {
    color: '#fff',
  },
  optionLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    marginTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  optionColumn: {
    marginBottom: 16,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    marginRight: 8,
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#00D4FF',
  },
  optionText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedOptionText: {
    color: '#1a1a1a',
  },
  listOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    marginBottom: 8,
  },
  selectedListOption: {
    backgroundColor: '#00D4FF',
  },
  listOptionText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  selectedListOptionText: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  optionWithCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#555',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadio: {
    borderColor: '#00D4FF',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00D4FF',
  },
  bullishOption: {
    backgroundColor: '#4CAF50',
  },
  bearishOption: {
    backgroundColor: '#f44336',
  },
  notSureOption: {
    backgroundColor: '#FF9800',
  },
  alignmentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
  },
  conflictWarning: {
    backgroundColor: '#2a1f1a',
    borderColor: '#FF9800',
  },
  alignedWarning: {
    backgroundColor: '#1a2a1a',
    borderColor: '#4CAF50',
  },
  alignmentText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  conflictText: {
    color: '#FF9800',
  },
  alignedText: {
    color: '#4CAF50',
  },
  displacementTypeSection: {
    marginTop: 12,
  },
  swingPointTypeSection: {
    marginTop: 12,
  },
  timeZoneSection: {
    marginTop: 12,
  },
  completionSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2a1a',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  completionText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  rrDisplay: {
    alignItems: 'center',
    marginVertical: 12,
  },
  rrDisplayBox: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rrDisplayText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rrHelpText: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  tradingReminderSection: {
    backgroundColor: '#1a1a2a',
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#00D4FF',
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00D4FF',
    marginBottom: 12,
  },
  reminderContent: {
    gap: 8,
  },
  reminderText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  reminderBold: {
    fontWeight: 'bold',
    color: '#00D4FF',
  },
  lockedTab: {
    opacity: 0.5,
  },
  lockedTabText: {
    color: '#444',
  },
  imageUploadSection: {
    marginVertical: 20,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  imageUploadTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  uploadSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a2a1a',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  uploadSuccessText: {
    color: '#4CAF50',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#00D4FF',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00D4FF',
    marginTop: 8,
  },
  uploadButtonSubtext: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0a0a0a',
  },
  imagePreviewContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    position: 'relative',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  imageActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  imageActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  removeButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
  },
  imageActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  zoomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  zoomContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  zoomScrollView: {
    flex: 1,
  },
  zoomScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImageTouchable: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  zoomedImage: {
    width: Dimensions.get('window').width - 40,
    height: Dimensions.get('window').height - 40,
  },
  closeZoomButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  zoomControls: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  zoomHintText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  noMansLandWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    backgroundColor: '#2a1f1a',
    borderColor: '#FF9800',
  },
  noMansLandWarningText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    flex: 1,
  },
  warningOption: {
    backgroundColor: '#2a1f1a',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  warningRadio: {
    borderColor: '#FF9800',
  },
  warningText: {
    color: '#FF9800',
    fontWeight: '600',
  },
  warningIcon: {
    marginLeft: 8,
  },
  lockScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#0a0a0a',
  },
  lockTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  lockMessageBox: {
    backgroundColor: '#2a1f1a',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF9800',
    marginBottom: 40,
  },
  lockMessageText: {
    fontSize: 16,
    color: '#FF9800',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '600',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  timerLabel: {
    fontSize: 18,
    color: '#ccc',
    marginBottom: 8,
    fontWeight: '600',
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#00D4FF',
    marginBottom: 8,
  },
  timerSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  lockSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  iofedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1f1a',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  iofedWarningText: {
    color: '#FF9800',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  skipTradingWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2a1f1a',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  skipTradingContent: {
    flex: 1,
    marginLeft: 12,
  },
  skipTradingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 8,
  },
  skipTradingText: {
    fontSize: 14,
    color: '#FF9800',
    lineHeight: 20,
    marginBottom: 8,
  },
  lockTimeText: {
    fontSize: 12,
    color: '#FF9800',
    opacity: 0.8,
    fontStyle: 'italic',
  },
  // Стили для калькулятора
  calculatorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  calculatorContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    borderWidth: 2,
    borderColor: '#00D4FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  calculatorHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  calculatorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00D4FF',
    marginBottom: 8,
    textAlign: 'center',
  },
  calculatorSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  calculatorContent: {
    maxHeight: 480,
    marginBottom: 12,
  },
  calculatorContentContainer: {
    paddingBottom: 8,
  },
  calculatorSection: {
    marginBottom: 20,
  },
  calculatorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  calculatorInput: {
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#fff',
    fontSize: 16,
    height: 50,
    marginBottom: 8,
  },
  riskButtonsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  riskButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#0a0a0a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskButtonSelected: {
    backgroundColor: '#00D4FF',
    borderColor: '#00D4FF',
  },
  riskButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  riskButtonTextSelected: {
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  calculatorResultSection: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#00D4FF',
    alignItems: 'center',
  },
  lotSizeDisplay: {
    alignItems: 'center',
    marginVertical: 8,
  },
  lotSizeText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00D4FF',
    marginBottom: 4,
  },
  lotSizeLabel: {
    fontSize: 18,
    color: '#888',
    fontWeight: '600',
  },
  calculationDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    width: '100%',
  },
  detailText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 6,
    textAlign: 'center',
  },
  calculatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#00D4FF',
  },
  calculatorInfoText: {
    fontSize: 14,
    color: '#00D4FF',
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  calculatorActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  calculatorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  calculatorClearButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  calculatorClearButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  calculatorCloseButton: {
    backgroundColor: '#00D4FF',
  },
  calculatorCloseButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: 'bold',
  },
});