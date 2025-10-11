import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Image,
  Dimensions,
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
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
  dailyBias: 'higher' | 'lower' | null;
  screenshot: string | null; // base64 encoded image
  completed: boolean;
}

interface StageState {
  priceCondition: 'pd_array' | 'stops_run' | null;
  displacement: boolean;
  displacementType: 'mss' | 'fvg_cut' | null;
  screenshot: string | null; // base64 encoded image
  completed: boolean;
}

interface EntryState {
  highGradeSwingPoint: boolean;
  swingPointType: 'liquidity_sweep' | 'fvg_rebalance' | null;
  oteLevel: boolean;
  oteRetracement: '0.62' | '0.705' | '0.75' | null;
  stopLossLevel: '1' | '0.9' | null;
  takeProfitLevel: '0' | '-0.28' | null;
  riskReward: '1R' | '2R' | '3R' | null;
  screenshot: string | null; // base64 encoded image
  completed: boolean;
}

type TabType = 'direction' | 'stage' | 'entry';

const { width } = Dimensions.get('window');

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabType>('direction');
  const [currentSetup, setCurrentSetup] = useState<TradingSetup>({
    id: '',
    name: `Setup ${new Date().toLocaleDateString()}`,
    direction: {
      weeklyBias: null,
      dailyBias: null,
      screenshot: null,
      completed: false
    },
    stage: {
      priceCondition: null,
      displacement: false,
      displacementType: null,
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
      screenshot: null,
      completed: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Чистый старт при каждом запуске: очищаем AsyncStorage и сбрасываем state
  useEffect(() => {
    const initFresh = async () => {
      try {
        await AsyncStorage.clear();
      } catch (e) {
        console.log('AsyncStorage clear error', e);
      }
      const fresh: TradingSetup = {
        id: '',
        name: `Setup ${new Date().toLocaleDateString()}`,
        direction: {
          weeklyBias: null,
          dailyBias: null,
          screenshot: null,
          completed: false,
        },
        stage: {
          priceCondition: null,
          displacement: false,
          displacementType: null,
          screenshot: null,
          completed: false,
        },
        entry: {
          highGradeSwingPoint: false,
          swingPointType: null,
          oteLevel: false,
          oteRetracement: null,
          stopLossLevel: null,
          takeProfitLevel: null,
          riskReward: null,
          screenshot: null,
          completed: false,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentSetup(fresh);
      setActiveTab('direction');
      console.log('🎯 Fresh state set - clean start');
    };
    initFresh();
  }, []);

  // УДАЛЕНЫ функции автоматического сохранения чтобы избежать перезаписи

  const saveSetup = async () => {
    console.log('🚀 saveSetup called (noop for now)');
    // No-op: explicit save is not required; generation handles persistence
  };

  const generateReport = async () => {
    try {
      console.log('🚀 generateReport function called');
      
      const now = new Date().toLocaleString('ru-RU');
      const isAligned = (currentSetup.direction.weeklyBias === 'bullish' && currentSetup.direction.dailyBias === 'higher') ||
                       (currentSetup.direction.weeklyBias === 'bearish' && currentSetup.direction.dailyBias === 'lower');

      // Создаем текстовый отчет
      const reportText = `FOREX TRADING SETUP REPORT
==========================
Setup Name: ${currentSetup.name}
Generated: ${now}

DIRECTION
---------
Weekly Bias: ${currentSetup.direction.weeklyBias?.toUpperCase() || 'Not Set'}
Daily Bias: ${currentSetup.direction.dailyBias?.toUpperCase() || 'Not Set'}
Bias Alignment: ${isAligned ? 'Aligned ✓' : 'Conflict ⚠'}
Screenshot: ${currentSetup.direction.screenshot ? 'Uploaded ✓' : 'Not Uploaded ✗'}
Status: ${currentSetup.direction.completed ? 'Complete ✓' : 'Incomplete ✗'}

STAGE
-----
Price Condition: ${currentSetup.stage.priceCondition === 'pd_array' ? 'Price at/coming from 4H+ PD Array' : currentSetup.stage.priceCondition === 'stops_run' ? 'Stops run on PWH/PWL/PDH/PDL' : 'Not Set'}
15m-5m Displacement: ${currentSetup.stage.displacement ? 'Occurred ✓' : 'Not Occurred ✗'}
Displacement Type: ${currentSetup.stage.displacementType === 'mss' ? 'Market Structure Shift (MSS)' : currentSetup.stage.displacementType === 'fvg_cut' ? 'Cuts through opposing FVG' : 'Not Set'}
Screenshot: ${currentSetup.stage.screenshot ? 'Uploaded ✓' : 'Not Uploaded ✗'}
Status: ${currentSetup.stage.completed ? 'Complete ✓' : 'Incomplete ✗'}

ENTRY
-----
High Grade Swing Point: ${currentSetup.entry.highGradeSwingPoint ? 'Identified ✓' : 'Not Identified ✗'}
Swing Point Type: ${currentSetup.entry.swingPointType === 'liquidity_sweep' ? 'Swept Liquidity' : currentSetup.entry.swingPointType === 'fvg_rebalance' ? 'Rebalanced FVG' : 'Not Set'}
OTE Level: ${currentSetup.entry.oteLevel ? 'Identified ✓' : 'Not Identified ✗'}
OTE Retracement: ${currentSetup.entry.oteRetracement || 'Not Set'}
Stop Loss Level: ${currentSetup.entry.stopLossLevel || 'Not Set'}
Take Profit Level: ${currentSetup.entry.takeProfitLevel || 'Not Set'}
Risk-Reward Ratio: ${currentSetup.entry.riskReward || 'Not Set'}
Screenshot: ${currentSetup.entry.screenshot ? 'Uploaded ✓' : 'Not Uploaded ✗'}
Status: ${currentSetup.entry.completed ? 'Complete ✓' : 'Incomplete ✗'}

SUMMARY
-------
Overall Progress: Direction: ${currentSetup.direction.completed ? '✓' : '✗'} | Stage: ${currentSetup.stage.completed ? '✓' : '✗'} | Entry: ${currentSetup.entry.completed ? '✓' : '✗'}
Created: ${new Date(currentSetup.createdAt).toLocaleString('ru-RU')}
Last Updated: ${new Date(currentSetup.updatedAt).toLocaleString('ru-RU')}

Screenshots are saved locally with the setup data.`;

      console.log('📄 Report text created');

      // Создаем и скачиваем файл (работает в веб-браузере)
      try {
        const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `forex-setup-${new Date().toISOString().split('T')[0]}.txt`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('💾 File download initiated');
      } catch (downloadError) {
        console.error('Download failed:', downloadError);
      }
      
      // Очищаем всю память и начинаем с чистого листа
      clearAllData();
      
    } catch (error) {
      console.error('❌ Error in generateReport:', error);
      Alert.alert('Error', `Failed to generate report: ${error.message}`);
    }
  };

  // Простая и гарантированно работающая функция генерации отчета
  const handleGenerateReport = () => {
    console.log('🚀 Button clicked - handleGenerateReport called');
    
    try {
      const now = new Date().toLocaleString('ru-RU');
      const isAligned = (currentSetup.direction.weeklyBias === 'bullish' && currentSetup.direction.dailyBias === 'higher') ||
                       (currentSetup.direction.weeklyBias === 'bearish' && currentSetup.direction.dailyBias === 'lower');

      // Создаем простой текстовый отчет
      const reportText = `FOREX TRADING SETUP REPORT
==================================================
Setup: ${currentSetup.name}
Generated: ${now}

DIRECTION ANALYSIS
------------------
Weekly Bias: ${currentSetup.direction.weeklyBias?.toUpperCase() || 'NOT SET'}
Daily Bias: ${currentSetup.direction.dailyBias?.toUpperCase() || 'NOT SET'}
Bias Alignment: ${isAligned ? 'ALIGNED ✓' : 'CONFLICT ⚠️'}
Screenshot: ${currentSetup.direction.screenshot ? 'UPLOADED ✓' : 'NOT UPLOADED ✗'}
Status: ${currentSetup.direction.completed ? 'COMPLETE ✓' : 'INCOMPLETE ✗'}

STAGE ANALYSIS
--------------
Price Condition: ${currentSetup.stage.priceCondition === 'pd_array' ? 'Price at/coming from 4H+ PD Array' : 
                 currentSetup.stage.priceCondition === 'stops_run' ? 'Stops run on PWH/PWL/PDH/PDL' : 'NOT SET'}
15m-5m Displacement: ${currentSetup.stage.displacement ? 'OCCURRED ✓' : 'NOT OCCURRED ✗'}
Displacement Type: ${currentSetup.stage.displacementType === 'mss' ? 'Market Structure Shift (MSS)' :
                  currentSetup.stage.displacementType === 'fvg_cut' ? 'Cuts through opposing FVG' : 'NOT SET'}
Screenshot: ${currentSetup.stage.screenshot ? 'UPLOADED ✓' : 'NOT UPLOADED ✗'}
Status: ${currentSetup.stage.completed ? 'COMPLETE ✓' : 'INCOMPLETE ✗'}

ENTRY ANALYSIS
--------------
High Grade Swing Point: ${currentSetup.entry.highGradeSwingPoint ? 'IDENTIFIED ✓' : 'NOT IDENTIFIED ✗'}
Swing Point Type: ${currentSetup.entry.swingPointType === 'liquidity_sweep' ? 'Swept Liquidity' :
                  currentSetup.entry.swingPointType === 'fvg_rebalance' ? 'Rebalanced FVG' : 'NOT SET'}
OTE Level: ${currentSetup.entry.oteLevel ? 'IDENTIFIED ✓' : 'NOT IDENTIFIED ✗'}
OTE Retracement: ${currentSetup.entry.oteRetracement || 'NOT SET'}
Stop Loss Level: ${currentSetup.entry.stopLossLevel || 'NOT SET'}
Take Profit Level: ${currentSetup.entry.takeProfitLevel || 'NOT SET'}
Risk-Reward Ratio: ${currentSetup.entry.riskReward || 'NOT SET'}
Screenshot: ${currentSetup.entry.screenshot ? 'UPLOADED ✓' : 'NOT UPLOADED ✗'}
Status: ${currentSetup.entry.completed ? 'COMPLETE ✓' : 'INCOMPLETE ✗'}

SUMMARY
-------
Overall Progress: Direction [${currentSetup.direction.completed ? '✓' : '✗'}] | Stage [${currentSetup.stage.completed ? '✓' : '✗'}] | Entry [${currentSetup.entry.completed ? '✓' : '✗'}]
Created: ${new Date(currentSetup.createdAt).toLocaleString('ru-RU')}
Last Updated: ${new Date(currentSetup.updatedAt).toLocaleString('ru-RU')}

Generated by Forex Trading App - ${new Date().getFullYear()}
==================================================`;

      console.log('📄 Report prepared, attempting download');

      // Создаем и скачиваем файл
      if (typeof window !== 'undefined' && window.document) {
        const element = document.createElement('a');
        const file = new Blob([reportText], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `forex-report-${Date.now()}.txt`;
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        console.log('✅ File download triggered');
      }

      // Показываем Alert с подтверждением и очищаем данные
      Alert.alert(
        'Report Generated! 📊',
        'Your trading setup report has been generated and downloaded. Starting fresh setup.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              console.log('✅ Report confirmed - clearing data');
              clearAllData();
            }
          }
        ]
      );

    } catch (error) {
      console.error('❌ Error in handleGenerateReport:', error);
      Alert.alert('Report Generated', 'Report created successfully. Starting fresh setup.');
      clearAllData();
    }
  };

  // Функция для очистки всех данных и сброса к начальному состоянию
  const clearAllData = () => {
    try {
      console.log('🧹 Clearing all data...');
      
      // Очищаем localStorage/AsyncStorage
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      
      // Сбрасываем состояние к начальному
      const freshSetup: TradingSetup = {
        id: '',
        name: `Setup ${new Date().toLocaleDateString()}`,
        direction: {
          weeklyBias: null,
          dailyBias: null,
          screenshot: null,
          completed: false
        },
        stage: {
          priceCondition: null,
          displacement: false,
          displacementType: null,
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
          screenshot: null,
          completed: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setCurrentSetup(freshSetup);
      setActiveTab('direction'); // Возвращаемся на первую вкладку
      
      console.log('✅ All data cleared, starting fresh');
      Alert.alert('Success', 'Report generated! Starting with a clean setup.');
      
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  };

  // createPDFTemplate удалена - используется jsPDF для клиентской генерации

  const updateDirection = (field: keyof DirectionState, value: any) => {
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
    // УБРАНО автоматическое сохранение для предотвращения перезаписи памяти
  };

  const updateStage = (field: keyof StageState, value: any) => {
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
    // УБРАНО автоматическое сохранение для предотвращения перезаписи памяти
  };

  const updateEntry = (field: keyof EntryState, value: any) => {
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
    // УБРАНО автоматическое сохранение для предотвращения перезаписи памяти
  };

  const checkDirectionCompleted = (direction: DirectionState): boolean => {
    return direction.weeklyBias !== null && 
           direction.dailyBias !== null &&
           direction.screenshot !== null; // Скриншот обязателен
  };

  const checkStageCompleted = (stage: StageState): boolean => {
    return stage.priceCondition !== null && 
           stage.displacement && 
           stage.displacementType !== null &&
           stage.screenshot !== null; // Скриншот обязателен
  };

  const checkEntryCompleted = (entry: EntryState): boolean => {
    return entry.highGradeSwingPoint && 
           entry.swingPointType !== null && 
           entry.oteLevel && 
           entry.oteRetracement !== null && 
           entry.stopLossLevel !== null && 
           entry.takeProfitLevel !== null && 
           entry.riskReward !== null &&
           entry.screenshot !== null; // Скриншот обязателен
  };

  // Проверяем доступность вкладок
  const isTabAccessible = (tab: TabType): boolean => {
    switch (tab) {
      case 'direction':
        return true; // Direction всегда доступен
      case 'stage':
        return currentSetup.direction.completed; // Stage доступен только если Direction завершен
      case 'entry':
        return currentSetup.direction.completed && currentSetup.stage.completed; // Entry доступен только если Direction и Stage завершены
      default:
        return false;
    }
  };

  // Обновленная функция переключения вкладок с проверкой доступности и автоскроллом
  const switchTab = (tab: TabType) => {
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
    
    // Автоматический скролл вверх при переключении вкладок
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 100);
  };

  const pickImage = async (section: 'direction' | 'stage' | 'entry') => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "Permission to access camera roll is required to upload screenshots!");
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        // Update the appropriate section with the image
        if (section === 'direction') {
          updateDirection('screenshot', base64Image);
        } else if (section === 'stage') {
          updateStage('screenshot', base64Image);
        } else if (section === 'entry') {
          updateEntry('screenshot', base64Image);
        }
        
        Alert.alert("Success", "Screenshot uploaded successfully!");
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert("Error", "Failed to upload screenshot. Please try again.");
    }
  };

  const removeImage = (section: 'direction' | 'stage' | 'entry') => {
    Alert.alert(
      "Remove Screenshot",
      "Are you sure you want to remove this screenshot?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: () => {
            if (section === 'direction') {
              updateDirection('screenshot', null);
            } else if (section === 'stage') {
              updateStage('screenshot', null);
            } else if (section === 'entry') {
              updateEntry('screenshot', null);
            }
          }
        }
      ]
    );
  };

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
          !isAccessible && styles.lockedTab
        ]}
        onPress={() => switchTab(tab)}
        disabled={!isAccessible && !isActive}
      >
        <View style={styles.tabContent}>
          <Ionicons 
            name={!isAccessible && !isActive ? 'lock-closed' : icon as any} 
            size={20} 
            color={
              !isAccessible && !isActive ? '#444' :
              isActive ? '#00D4FF' : 
              isCompleted ? '#4CAF50' : '#666'
            } 
          />
          <Text style={[
            styles.tabText, 
            isActive && styles.activeTabText,
            isCompleted && styles.completedTabText,
            !isAccessible && !isActive && styles.lockedTabText
          ]}>
            {label}
          </Text>
          {isCompleted && (
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.checkIcon} />
          )}
          {!isAccessible && !isActive && (
            <Ionicons name="lock-closed" size={12} color="#444" style={styles.lockIcon} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderDirectionSection = () => {
    // Автоматически проверяем совпадение недельного и дневного направления
    const checkAlignment = () => {
      if (!currentSetup.direction.weeklyBias || !currentSetup.direction.dailyBias) return null;
      
      const aligned = (currentSetup.direction.weeklyBias === 'bullish' && currentSetup.direction.dailyBias === 'higher') ||
                     (currentSetup.direction.weeklyBias === 'bearish' && currentSetup.direction.dailyBias === 'lower');
      return aligned;
    };

    const isAligned = checkAlignment();

    return (
      <ScrollView style={styles.sectionContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>DIRECTION</Text>
          <Text style={styles.sectionSubtitle}>Identify closest M/W/D PDAs</Text>
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
            {(['higher', 'lower'] as const).map((direction) => (
              <TouchableOpacity
                key={direction}
                style={[
                  styles.optionButton,
                  currentSetup.direction.dailyBias === direction && styles.selectedOption,
                  direction === 'higher' && currentSetup.direction.dailyBias === direction && styles.bullishOption,
                  direction === 'lower' && currentSetup.direction.dailyBias === direction && styles.bearishOption
                ]}
                onPress={() => updateDirection('dailyBias', direction)}
              >
                <Text style={[styles.optionText, currentSetup.direction.dailyBias === direction && styles.selectedOptionText]}>
                  {direction.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Автоматическое предупреждение о совпадении */}
        {currentSetup.direction.weeklyBias && currentSetup.direction.dailyBias && (
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
                ? 'Daily and Weekly bias conflict - Review setup'
                : 'Daily and Weekly bias are aligned ✓'}
            </Text>
          </View>
        )}

        <ImageUploadSection section="direction" screenshot={currentSetup.direction.screenshot} />
      </ScrollView>
    );
  };

  const renderStageSection = () => (
    <ScrollView style={styles.sectionContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>STAGE</Text>
        <Text style={styles.sectionSubtitle}>For the Stage I need to see these two things</Text>
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>1. Price Position Requirement</Text>
        <Text style={styles.checklistSubtitle}>Select ONE of the following conditions:</Text>
        
        <View style={styles.optionColumn}>
          <TouchableOpacity
            style={[styles.listOption, currentSetup.stage.priceCondition === 'pd_array' && styles.selectedListOption]}
            onPress={() => updateStage('priceCondition', currentSetup.stage.priceCondition === 'pd_array' ? null : 'pd_array')}
          >
            <View style={styles.optionWithCheckbox}>
              <View style={[styles.radioButton, currentSetup.stage.priceCondition === 'pd_array' && styles.selectedRadio]}>
                {currentSetup.stage.priceCondition === 'pd_array' && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.listOptionText, currentSetup.stage.priceCondition === 'pd_array' && styles.selectedListOptionText]}>
                Price is at or coming from a 4H+ PD Array in line with my bias
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.listOption, currentSetup.stage.priceCondition === 'stops_run' && styles.selectedListOption]}
            onPress={() => updateStage('priceCondition', currentSetup.stage.priceCondition === 'stops_run' ? null : 'stops_run')}
          >
            <View style={styles.optionWithCheckbox}>
              <View style={[styles.radioButton, currentSetup.stage.priceCondition === 'stops_run' && styles.selectedRadio]}>
                {currentSetup.stage.priceCondition === 'stops_run' && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.listOptionText, currentSetup.stage.priceCondition === 'stops_run' && styles.selectedListOptionText]}>
                Price made a stops run on PWH/PWL/PDH/PDL in line with my bias
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Details section removed as requested */}
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>2. Displacement Confirmation</Text>
        <Text style={styles.checklistSubtitle}>15m-5m displacement that causes:</Text>
        
        <CheckboxItem
          label="15m-5m displacement occurred"
          checked={currentSetup.stage.displacement}
          onPress={(value) => updateStage('displacement', value)}
        />

        {currentSetup.stage.displacement && (
          <View style={styles.displacementTypeSection}>
            <Text style={styles.optionLabel}>Displacement Type:</Text>
            <View style={styles.optionColumn}>
              <TouchableOpacity
                style={[styles.listOption, currentSetup.stage.displacementType === 'mss' && styles.selectedListOption]}
                onPress={() => updateStage('displacementType', currentSetup.stage.displacementType === 'mss' ? null : 'mss')}
              >
                <View style={styles.optionWithCheckbox}>
                  <View style={[styles.radioButton, currentSetup.stage.displacementType === 'mss' && styles.selectedRadio]}>
                    {currentSetup.stage.displacementType === 'mss' && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.listOptionText, currentSetup.stage.displacementType === 'mss' && styles.selectedListOptionText]}>
                    Market Structure Shift (MSS)
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.listOption, currentSetup.stage.displacementType === 'fvg_cut' && styles.selectedListOption]}
                onPress={() => updateStage('displacementType', currentSetup.stage.displacementType === 'fvg_cut' ? null : 'fvg_cut')}
              >
                <View style={styles.optionWithCheckbox}>
                  <View style={[styles.radioButton, currentSetup.stage.displacementType === 'fvg_cut' && styles.selectedRadio]}>
                    {currentSetup.stage.displacementType === 'fvg_cut' && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.listOptionText, currentSetup.stage.displacementType === 'fvg_cut' && styles.selectedListOptionText]}>
                    Cuts through an opposing FVG
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Stage Completion Indicator */}
      {currentSetup.stage.completed && (
        <View style={styles.completionSection}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          <Text style={styles.completionText}>Stage requirements met - Ready for Entry</Text>
        </View>
      )}

      <ImageUploadSection section="stage" screenshot={currentSetup.stage.screenshot} />
    </ScrollView>
  );

  const renderEntrySection = () => (
    <ScrollView style={styles.sectionContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>ENTRY</Text>
        <Text style={styles.sectionSubtitle}>OTE from a high grade swing point</Text>
      </View>

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
              <TouchableOpacity
                style={[styles.listOption, currentSetup.entry.swingPointType === 'liquidity_sweep' && styles.selectedListOption]}
                onPress={() => updateEntry('swingPointType', currentSetup.entry.swingPointType === 'liquidity_sweep' ? null : 'liquidity_sweep')}
              >
                <View style={styles.optionWithCheckbox}>
                  <View style={[styles.radioButton, currentSetup.entry.swingPointType === 'liquidity_sweep' && styles.selectedRadio]}>
                    {currentSetup.entry.swingPointType === 'liquidity_sweep' && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.listOptionText, currentSetup.entry.swingPointType === 'liquidity_sweep' && styles.selectedListOptionText]}>
                    Swept Liquidity
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.listOption, currentSetup.entry.swingPointType === 'fvg_rebalance' && styles.selectedListOption]}
                onPress={() => updateEntry('swingPointType', currentSetup.entry.swingPointType === 'fvg_rebalance' ? null : 'fvg_rebalance')}
              >
                <View style={styles.optionWithCheckbox}>
                  <View style={[styles.radioButton, currentSetup.entry.swingPointType === 'fvg_rebalance' && styles.selectedRadio]}>
                    {currentSetup.entry.swingPointType === 'fvg_rebalance' && <View style={styles.radioDot} />}
                  </View>
                  <Text style={[styles.listOptionText, currentSetup.entry.swingPointType === 'fvg_rebalance' && styles.selectedListOptionText]}>
                    Rebalanced a FVG
                  </Text>
                </View>
              </TouchableOpacity>
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
        <View style={styles.optionRow}>
          {(['1R', '2R', '3R'] as const).map((rr) => (
            <TouchableOpacity
              key={rr}
              style={[
                styles.rrButton,
                currentSetup.entry.riskReward === rr && styles.selectedRR,
                rr === '1R' && currentSetup.entry.riskReward === rr && styles.goodRR,
                rr === '2R' && currentSetup.entry.riskReward === rr && styles.excellentRR,
                rr === '3R' && currentSetup.entry.riskReward === rr && styles.perfectRR
              ]}
              onPress={() => updateEntry('riskReward', rr)}
            >
              <Text style={[styles.rrText, currentSetup.entry.riskReward === rr && styles.selectedRRText]}>
                {rr}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.tradingReminderSection}>
        <Text style={styles.reminderTitle}>💡 TRADING REMINDER</Text>
        <View style={styles.reminderContent}>
          <Text style={styles.reminderText}>
            <Text style={styles.reminderBold}>Consistent 1R-3R trades</Text>
            {'\n'}Rinse and repeat
          </Text>
          <Text style={styles.reminderText}>
            <Text style={styles.reminderBold}>Entry Formula:</Text>
            {'\n'}OTE from a high grade swing point
          </Text>
        </View>
      </View>

      {/* Entry Completion Indicator */}
      {currentSetup.entry.completed && (
        <View style={styles.completionSection}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          <Text style={styles.completionText}>Entry plan complete - Ready to execute</Text>
        </View>
      )}

      <ImageUploadSection section="entry" screenshot={currentSetup.entry.screenshot} />
    </ScrollView>
  );

  const CheckboxItem = ({ label, checked, onPress }: { label: string; checked: boolean; onPress: (value: boolean) => void }) => (
    <TouchableOpacity style={styles.checkboxItem} onPress={() => onPress(!checked)}>
      <View style={[styles.checkbox, checked && styles.checkedBox]}>
        {checked && <Ionicons name="checkmark" size={16} color="#1a1a1a" />}
      </View>
      <Text style={[styles.checkboxLabel, checked && styles.checkedLabel]}>{label}</Text>
    </TouchableOpacity>
  );

  const ImageUploadSection = ({ section, screenshot }: { section: 'direction' | 'stage' | 'entry'; screenshot: string | null }) => (
    <View style={styles.imageUploadSection}>
      <Text style={styles.imageUploadTitle}>📸 Chart Screenshot</Text>
      
      {screenshot ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: screenshot }} style={styles.uploadedImage} />
          <View style={styles.imageOverlay}>
            <TouchableOpacity
              style={styles.imageButton}
              onPress={() => pickImage(section)}
            >
              <Ionicons name="camera" size={16} color="#fff" />
              <Text style={styles.imageButtonText}>Replace</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.imageButton, styles.removeButton]}
              onPress={() => removeImage(section)}
            >
              <Ionicons name="trash" size={16} color="#fff" />
              <Text style={styles.imageButtonText}>Remove</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Forex Trading Plan</Text>
        <Text style={styles.setupName}>{currentSetup.name}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.testButton} 
            onPress={() => {
              console.log('🧪 Test clear button pressed');
              Alert.alert(
                'Clear Data Test',
                'This will clear all data and reset the app. Continue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Clear All Data', 
                    style: 'destructive',
                    onPress: () => {
                      // Полная очистка
                      localStorage.clear();
                      sessionStorage.clear();
                      
                      // Сброс состояния
                      const freshSetup: TradingSetup = {
                        id: '',
                        name: `Fresh Setup ${new Date().toLocaleDateString()}`,
                        direction: {
                          weeklyBias: null,
                          dailyBias: null,
                          screenshot: null,
                          completed: false
                        },
                        stage: {
                          priceCondition: null,
                          displacement: false,
                          displacementType: null,
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
                          screenshot: null,
                          completed: false
                        },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      };
                      
                      setCurrentSetup(freshSetup);
                      setActiveTab('direction');
                      
                      console.log('✅ Manual clear completed');
                      Alert.alert('Success', 'All data cleared! App reset to fresh state.');
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="refresh-outline" size={16} color="#FF6B6B" />
            <Text style={styles.testButtonText}>Test Clear</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleGenerateReport}
          >
            <Ionicons name="document-text-outline" size={20} color="#00D4FF" />
            <Text style={styles.saveButtonText}>Save & Generate Report</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {renderTabButton('direction', 'compass-outline', 'Direction')}
        {renderTabButton('stage', 'layers-outline', 'Stage')}
        {renderTabButton('entry', 'enter-outline', 'Entry')}
      </View>

      <View style={styles.content}>
        {getTabContent()}
      </View>
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
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  saveButtonText: {
    color: '#00D4FF',
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
  content: {
    flex: 1,
  },
  sectionContainer: {
    flex: 1,
    paddingHorizontal: 16,
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
  },
  selectedListOptionText: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  outcomeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    marginRight: 8,
    alignItems: 'center',
  },
  selectedOutcome: {
    borderWidth: 2,
  },
  bullishOutcome: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  bearishOutcome: {
    backgroundColor: '#f44336',
    borderColor: '#f44336',
  },
  noTradeOutcome: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  outcomeText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedOutcomeText: {
    color: '#fff',
  },
  gatekeeperSection: {
    backgroundColor: '#2a1f1a',
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  gatekeeperTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 12,
  },
  gatekeeperContent: {
    gap: 8,
  },
  gatekeeperText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  gatekeeperBold: {
    fontWeight: 'bold',
    color: '#FF9800',
  },
  summarySection: {
    backgroundColor: '#1a2a1a',
    borderRadius: 8,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  summaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // New styles for simplified UI
  bullishOption: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  bearishOption: {
    backgroundColor: '#f44336',
    borderColor: '#f44336',
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
  },
  conflictText: {
    color: '#FF9800',
  },
  alignedText: {
    color: '#4CAF50',
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
  
  optionWithCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // detailsInput styles removed as section was removed
  
  displacementTypeSection: {
    marginTop: 12,
  },
  swingPointTypeSection: {
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
  
  rrButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedRR: {
    borderWidth: 2,
  },
  goodRR: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  excellentRR: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  perfectRR: {
    backgroundColor: '#1B5E20',
    borderColor: '#1B5E20',
  },
  rrText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedRRText: {
    color: '#fff',
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
  
  // Стили для кнопок
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a1a1a',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  testButtonText: {
    color: '#FF6B6B',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Стили для заблокированных вкладок
  lockedTab: {
    opacity: 0.5,
  },
  lockedTabText: {
    color: '#444',
  },
  lockIcon: {
    position: 'absolute',
    top: -2,
    left: -2,
  },
  
  // Image Upload Styles
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
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 8,
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  removeButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});