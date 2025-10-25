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
  dailyBias: 'higher' | 'lower' | null;
  pdasIdentified: boolean;
  screenshot: string | null;
  completed: boolean;
}

interface StageState {
  priceCondition: 'pd_array' | 'stops_run' | null;
  displacement: boolean;
  displacementType: 'mss' | 'fvg_cut' | null;
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

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabType>('direction');
  const [currentSetup, setCurrentSetup] = useState<TradingSetup>({
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

  const [uploadStatus, setUploadStatus] = useState<{
    direction: boolean;
    stage: boolean;
    entry: boolean;
  }>({
    direction: false,
    stage: false,
    entry: false
  });

  const mainScrollRef = useRef<ScrollView>(null);

  const scrollToTop = () => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ y: 0, animated: true });
    }
  };

  // Загрузка данных при запуске
  useEffect(() => {
    const loadSavedData = async () => {
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
  }, []);

  // Сохранение данных при изменении
  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(currentSetup));
        console.log('💾 Данные сохранены');
      } catch (error) {
        console.error('Ошибка при сохранении данных:', error);
      }
    };

    saveData();
  }, [currentSetup]);

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
          case 'LOKZ': return 'London Kill Zone (LOKZ)';
          case 'NYOKZ': return 'New York Kill Zone (NYOKZ)';
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
      await AsyncStorage.removeItem(STORAGE_KEY);
      const freshSetup: TradingSetup = {
        id: '',
        name: `Setup ${new Date().toLocaleDateString()}`,
        direction: {
          weeklyBias: null,
          dailyBias: null,
          pdasIdentified: false,
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
          timeZoneSelected: false,
          timeZone: null,
          screenshot: null,
          completed: false,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentSetup(freshSetup);
      setActiveTab('direction');
      console.log('✅ All data cleared, starting fresh');
    } catch (error) {
      console.error('Error clearing data:', error);
      Alert.alert('Error', 'Failed to clear data');
    }
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to clear all data and start over? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: clearAllData
        }
      ]
    );
  };

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
  };

  const checkDirectionCompleted = (direction: DirectionState): boolean => {
    return direction.weeklyBias !== null && 
           direction.dailyBias !== null &&
           direction.pdasIdentified &&
           direction.screenshot !== null;
  };

  const checkStageCompleted = (stage: StageState): boolean => {
    return stage.priceCondition !== null && 
           stage.displacement && 
           stage.displacementType !== null &&
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
          <ScrollView 
            horizontal={true} 
            showsHorizontalScrollIndicator={true}
            style={styles.imageScrollView}
          >
            <Image 
              source={{ uri: screenshot }} 
              style={styles.uploadedImage}
              resizeMode="contain"
            />
          </ScrollView>
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

  const CheckboxItem = ({ label, checked, onPress }: { label: string; checked: boolean; onPress: (value: boolean) => void }) => (
    <TouchableOpacity style={styles.checkboxItem} onPress={() => onPress(!checked)}>
      <View style={[styles.checkbox, checked && styles.checkedBox]}>
        {checked && <Ionicons name="checkmark" size={16} color="#1a1a1a" />}
      </View>
      <Text style={[styles.checkboxLabel, checked && styles.checkedLabel]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderDirectionSection = () => {
    const checkAlignment = () => {
      if (!currentSetup.direction.weeklyBias || !currentSetup.direction.dailyBias) return null;
      
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
                Price is at or coming from a 4H+ PDA in line with daily Direction
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
                Price made a stops run on PWH/PWL/PDH/PDL in line with daily Direction
              </Text>
            </View>
          </TouchableOpacity>
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
                    Cuts through an opposing FVG(PDA)
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
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
          <Text style={styles.checklistTitle}>Time Zone Indentified</Text>
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
                {(['LOKZ', 'NYOKZ', 'LCKZ', 'NO_MANS_LAND'] as const).map((zone) => (
                  <TouchableOpacity
                    key={zone}
                    style={[
                      styles.listOption, 
                      currentSetup.entry.timeZone === zone && styles.selectedListOption,
                      zone === 'NO_MANS_LAND' && currentSetup.entry.timeZone === zone && styles.warningOption
                    ]}
                    onPress={() => updateEntry('timeZone', zone)}
                  >
                    <View style={styles.optionWithCheckbox}>
                      <View style={[
                        styles.radioButton, 
                        currentSetup.entry.timeZone === zone && styles.selectedRadio,
                        zone === 'NO_MANS_LAND' && currentSetup.entry.timeZone === zone && styles.warningRadio
                      ]}>
                        {currentSetup.entry.timeZone === zone && <View style={styles.radioDot} />}
                      </View>
                      <View style={styles.timeZoneTextContainer}>
                        <Text style={[
                          styles.listOptionText, 
                          currentSetup.entry.timeZone === zone && styles.selectedListOptionText,
                          zone === 'NO_MANS_LAND' && styles.warningText
                        ]}>
                          {zone === 'LOKZ' ? 'London Kill Zone (LOKZ) 2am-5am' : 
                           zone === 'NYOKZ' ? 'New York Kill Zone (NYOKZ) 7am-10am' : 
                           zone === 'LCKZ' ? 'London Close Kill Zone (LCKZ) 10am-12pm' : 
                           'No Man\'s Land'}
                        </Text>
                        {zone === 'NO_MANS_LAND' && (
                          <Text style={styles.warningSubtext}>High risk period</Text>
                        )}
                      </View>
                      {zone === 'NO_MANS_LAND' && (
                        <Ionicons name="warning" size={16} color="#FF9800" style={styles.warningIcon} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trading Plan</Text>
        <Text style={styles.setupName}>{currentSetup.name}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.clearButton} 
            onPress={handleClearData}
          >
            <Ionicons name="refresh" size={16} color="#FF6B6B" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleGenerateReport}
          >
            <Ionicons name="document-text-outline" size={16} color="#00D4FF" />
            <Text style={styles.saveButtonText}>Generate Report</Text>
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
    </SafeAreaView>
  );
}

// Стили остаются без изменений (такие же как в предыдущем коде)
const styles = StyleSheet.create({
  // ... все стили из предыдущего кода
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
    gap: 10,
    alignItems: 'center',
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
  },
  selectedListOptionText: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  bullishOption: {
    backgroundColor: '#4CAF50',
  },
  bearishOption: {
    backgroundColor: '#f44336',
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
  displacementTypeSection: {
    marginTop: 12,
  },
  swingPointTypeSection: {
    marginTop: 12,
  },
  timeZoneSection: {
    marginTop: 12,
  },
  timeZoneTextContainer: {
    flex: 1,
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
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    maxHeight: 400,
  },
  imageScrollView: {
    flex: 1,
  },
  uploadedImage: {
    width: width - 64,
    minHeight: 200,
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
  warningSubtext: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 2,
    opacity: 0.8,
  },
  warningIcon: {
    marginLeft: 8,
  },
});