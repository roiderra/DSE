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
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

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
  weeklyPattern: 'OHLC' | 'OLHC' | null;
  dailyBias: 'higher' | 'lower' | null;
  dailyAlignedWithWeekly: boolean;
  screenshot: string | null; // base64 encoded image
  completed: boolean;
}

interface StageState {
  priceCondition: 'pd_array' | 'stops_run' | null;
  priceConditionDetails: string;
  displacement: boolean;
  displacementType: 'mss' | 'fvg_cut' | null;
  screenshot: string | null; // base64 encoded image
  completed: boolean;
}

interface EntryState {
  highGradeSwingPoint: boolean;
  swingPointType: 'liquidity_sweep' | 'fvg_rebalance' | null;
  oteLevel: boolean;
  entryAt062: boolean;
  stopLossAt1: boolean;
  takeProfitAt0: boolean;
  riskReward: '1.5R' | '2R' | 'other' | null;
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
      weeklyPattern: null,
      dailyBias: null,
      dailyAlignedWithWeekly: false,
      screenshot: null,
      completed: false
    },
    stage: {
      priceCondition: null,
      priceConditionDetails: '',
      displacement: false,
      displacementType: null,
      screenshot: null,
      completed: false
    },
    entry: {
      highGradeSwingPoint: false,
      swingPointType: null,
      oteLevel: false,
      entryAt062: false,
      stopLossAt1: false,
      takeProfitAt0: false,
      riskReward: null,
      screenshot: null,
      completed: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  const saveSetup = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/setups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentSetup),
      });
      
      if (response.ok) {
        const savedSetup = await response.json();
        setCurrentSetup(savedSetup);
        Alert.alert('Success', 'Setup saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save setup:', error);
      Alert.alert('Error', 'Failed to save setup. Please try again.');
    }
  };

  const updateDirection = (field: keyof DirectionState, value: any) => {
    setCurrentSetup(prev => ({
      ...prev,
      direction: {
        ...prev.direction,
        [field]: value,
        completed: checkDirectionCompleted({
          ...prev.direction,
          [field]: value
        })
      },
      updatedAt: new Date().toISOString()
    }));
  };

  const updateStage = (field: keyof StageState, value: any) => {
    setCurrentSetup(prev => ({
      ...prev,
      stage: {
        ...prev.stage,
        [field]: value,
        completed: checkStageCompleted({
          ...prev.stage,
          [field]: value
        })
      },
      updatedAt: new Date().toISOString()
    }));
  };

  const updateEntry = (field: keyof EntryState, value: any) => {
    setCurrentSetup(prev => ({
      ...prev,
      entry: {
        ...prev.entry,
        [field]: value,
        completed: checkEntryCompleted({
          ...prev.entry,
          [field]: value
        })
      },
      updatedAt: new Date().toISOString()
    }));
  };

  const checkDirectionCompleted = (direction: DirectionState): boolean => {
    return direction.weeklyBias !== null && 
           direction.weeklyPattern !== null && 
           direction.dailyBias !== null;
  };

  const checkStageCompleted = (stage: StageState): boolean => {
    return stage.priceCondition !== null && 
           stage.displacement && 
           stage.displacementType !== null;
  };

  const checkEntryCompleted = (entry: EntryState): boolean => {
    return entry.highGradeSwingPoint && 
           entry.swingPointType !== null && 
           entry.oteLevel && 
           entry.entryAt062 && 
           entry.stopLossAt1 && 
           entry.takeProfitAt0 && 
           entry.riskReward !== null;
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

    return (
      <TouchableOpacity
        key={tab}
        style={[styles.tabButton, isActive && styles.activeTab]}
        onPress={() => setActiveTab(tab)}
      >
        <View style={styles.tabContent}>
          <Ionicons 
            name={icon as any} 
            size={20} 
            color={isActive ? '#00D4FF' : isCompleted ? '#4CAF50' : '#666'} 
          />
          <Text style={[
            styles.tabText, 
            isActive && styles.activeTabText,
            isCompleted && styles.completedTabText
          ]}>
            {label}
          </Text>
          {isCompleted && (
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={styles.checkIcon} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderDirectionSection = () => (
    <ScrollView style={styles.sectionContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>DIRECTION</Text>
        <Text style={styles.sectionSubtitle}>Am I anticipating a bullish or bearish week?</Text>
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

        <Text style={styles.optionLabel}>Weekly Pattern:</Text>
        <View style={styles.optionRow}>
          {(['OHLC', 'OLHC'] as const).map((pattern) => (
            <TouchableOpacity
              key={pattern}
              style={[styles.optionButton, currentSetup.direction.weeklyPattern === pattern && styles.selectedOption]}
              onPress={() => updateDirection('weeklyPattern', pattern)}
            >
              <Text style={[styles.optionText, currentSetup.direction.weeklyPattern === pattern && styles.selectedOptionText]}>
                {pattern}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>Daily Bias</Text>
        <Text style={styles.checklistSubtitle}>Is today's daily candle likely to trade higher or lower?</Text>
        <Text style={styles.checklistSubtitle}>(Should be in line with anticipated weekly bias)</Text>
        
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

        <CheckboxItem
          label="Daily bias aligns with weekly bias"
          checked={currentSetup.direction.dailyAlignedWithWeekly}
          onPress={(value) => updateDirection('dailyAlignedWithWeekly', value)}
        />
      </View>

      {/* Alignment Warning */}
      {currentSetup.direction.weeklyBias && currentSetup.direction.dailyBias && (
        <View style={[
          styles.alignmentWarning,
          (currentSetup.direction.weeklyBias === 'bullish' && currentSetup.direction.dailyBias === 'lower') ||
          (currentSetup.direction.weeklyBias === 'bearish' && currentSetup.direction.dailyBias === 'higher')
            ? styles.conflictWarning : styles.alignedWarning
        ]}>
          <Ionicons 
            name={(currentSetup.direction.weeklyBias === 'bullish' && currentSetup.direction.dailyBias === 'lower') ||
                  (currentSetup.direction.weeklyBias === 'bearish' && currentSetup.direction.dailyBias === 'higher')
                    ? 'warning' : 'checkmark-circle'} 
            size={20} 
            color={(currentSetup.direction.weeklyBias === 'bullish' && currentSetup.direction.dailyBias === 'lower') ||
                  (currentSetup.direction.weeklyBias === 'bearish' && currentSetup.direction.dailyBias === 'higher')
                    ? '#FF9800' : '#4CAF50'} 
          />
          <Text style={[
            styles.alignmentText,
            (currentSetup.direction.weeklyBias === 'bullish' && currentSetup.direction.dailyBias === 'lower') ||
            (currentSetup.direction.weeklyBias === 'bearish' && currentSetup.direction.dailyBias === 'higher')
              ? styles.conflictText : styles.alignedText
          ]}>
            {(currentSetup.direction.weeklyBias === 'bullish' && currentSetup.direction.dailyBias === 'lower') ||
             (currentSetup.direction.weeklyBias === 'bearish' && currentSetup.direction.dailyBias === 'higher')
              ? 'Daily and Weekly bias conflict - Review setup'
              : 'Daily and Weekly bias are aligned ✓'}
          </Text>
        </View>
      )}

      <ImageUploadSection section="direction" screenshot={currentSetup.direction.screenshot} />
    </ScrollView>
  );

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

        {currentSetup.stage.priceCondition && (
          <View style={styles.detailsInput}>
            <Text style={styles.inputLabel}>Details:</Text>
            <View style={styles.textInputContainer}>
              <Text style={styles.textInputPlaceholder}>
                {currentSetup.stage.priceConditionDetails || 'Add specific details about the price condition...'}
              </Text>
            </View>
          </View>
        )}
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
            <Text style={styles.optionLabel}>Swing Point Type:</Text>
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
        
        <CheckboxItem
          label="Enter at 0.62 retracement level"
          checked={currentSetup.entry.entryAt062}
          onPress={(value) => updateEntry('entryAt062', value)}
        />
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>Risk Management</Text>
        
        <CheckboxItem
          label="Stop loss goes at 1 (above/below swing point)"
          checked={currentSetup.entry.stopLossAt1}
          onPress={(value) => updateEntry('stopLossAt1', value)}
        />
        
        <CheckboxItem
          label="Take profit goes at 0 (displacement end)"
          checked={currentSetup.entry.takeProfitAt0}
          onPress={(value) => updateEntry('takeProfitAt0', value)}
        />

        <Text style={styles.optionLabel}>Risk-Reward Ratio:</Text>
        <View style={styles.optionRow}>
          {(['1.5R', '2R', 'other'] as const).map((rr) => (
            <TouchableOpacity
              key={rr}
              style={[
                styles.rrButton,
                currentSetup.entry.riskReward === rr && styles.selectedRR,
                rr === '1.5R' && currentSetup.entry.riskReward === rr && styles.goodRR,
                rr === '2R' && currentSetup.entry.riskReward === rr && styles.excellentRR
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
            <Text style={styles.reminderBold}>Consistent 1.5-2R trades</Text>
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
        <TouchableOpacity style={styles.saveButton} onPress={saveSetup}>
          <Ionicons name="save-outline" size={20} color="#00D4FF" />
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
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
  
  detailsInput: {
    marginTop: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 6,
  },
  textInputContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  textInputPlaceholder: {
    color: '#888',
    fontSize: 14,
  },
  
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
});