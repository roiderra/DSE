import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  pdArraysMarked: boolean;
  weeklyBias: 'bullish' | 'bearish' | 'none' | null;
  dailyBias: 'bullish' | 'bearish' | 'none' | null;
  arrayInteraction: 'bullish_rejection' | 'bearish_rejection' | 'between_arrays' | 'beyond_array' | null;
  sweepExpected: boolean;
  finalOutcome: 'bullish' | 'bearish' | 'no_trade' | null;
  completed: boolean;
}

interface StageState {
  atPDArray: boolean;
  stopsRun: boolean;
  displacementOccurred: boolean;
  mssOrFvgCut: boolean;
  timeframesAligned: boolean;
  completed: boolean;
}

interface EntryState {
  swingPointIdentified: boolean;
  stopRunConfirmed: boolean;
  pdaRejectionConfirmed: boolean;
  fibonacciApplied: boolean;
  oteMet: boolean;
  entryDefined: boolean;
  slTpSet: boolean;
  rrAcceptable: boolean;
  completed: boolean;
}

type TabType = 'direction' | 'stage' | 'entry';

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabType>('direction');
  const [currentSetup, setCurrentSetup] = useState<TradingSetup>({
    id: '',
    name: `Setup ${new Date().toLocaleDateString()}`,
    direction: {
      pdArraysMarked: false,
      biasFrame: null,
      biasType: null,
      arrayInteraction: null,
      sweepExpected: false,
      finalOutcome: null,
      completed: false
    },
    stage: {
      atPDArray: false,
      stopsRun: false,
      displacementOccurred: false,
      mssOrFvgCut: false,
      timeframesAligned: false,
      completed: false
    },
    entry: {
      swingPointIdentified: false,
      stopRunConfirmed: false,
      pdaRejectionConfirmed: false,
      fibonacciApplied: false,
      oteMet: false,
      entryDefined: false,
      slTpSet: false,
      rrAcceptable: false,
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
    return direction.pdArraysMarked && 
           direction.biasFrame !== null && 
           direction.finalOutcome !== null;
  };

  const checkStageCompleted = (stage: StageState): boolean => {
    return (stage.atPDArray || stage.stopsRun) && 
           stage.displacementOccurred && 
           (stage.mssOrFvgCut) && 
           stage.timeframesAligned;
  };

  const checkEntryCompleted = (entry: EntryState): boolean => {
    return entry.swingPointIdentified && 
           entry.fibonacciApplied && 
           entry.entryDefined && 
           entry.slTpSet && 
           entry.rrAcceptable;
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
        <Text style={styles.sectionSubtitle}>Define your market bias and direction</Text>
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>1. Mark Nearest PD Arrays</Text>
        <CheckboxItem
          label="Identify closest PD arrays on Monthly, Weekly, and Daily charts (FVG, OB, BB, MB, RB, Liquidity pools)"
          checked={currentSetup.direction.pdArraysMarked}
          onPress={(value) => updateDirection('pdArraysMarked', value)}
        />
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>2. Define Bias</Text>
        <Text style={styles.checklistSubtitle}>Frame bias as: "Where is the next HTF candle likely to print?"</Text>
        
        <Text style={styles.optionLabel}>Bias Timeframe:</Text>
        <View style={styles.optionRow}>
          {(['daily', 'weekly', 'monthly'] as const).map((frame) => (
            <TouchableOpacity
              key={frame}
              style={[styles.optionButton, currentSetup.direction.biasFrame === frame && styles.selectedOption]}
              onPress={() => updateDirection('biasFrame', frame)}
            >
              <Text style={[styles.optionText, currentSetup.direction.biasFrame === frame && styles.selectedOptionText]}>
                {frame.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.optionLabel}>Bias Type:</Text>
        <View style={styles.optionRow}>
          {(['bullish', 'bearish', 'none'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.optionButton, currentSetup.direction.biasType === type && styles.selectedOption]}
              onPress={() => updateDirection('biasType', type)}
            >
              <Text style={[styles.optionText, currentSetup.direction.biasType === type && styles.selectedOptionText]}>
                {type.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>3. Interaction with PD Arrays</Text>
        <View style={styles.optionColumn}>
          {[
            { key: 'bullish_rejection', label: 'Price rejects bullish array → favour LONGS' },
            { key: 'bearish_rejection', label: 'Price rejects bearish array → favour SHORTS' },
            { key: 'between_arrays', label: 'Price between two nearby arrays → NO TRADE' },
            { key: 'beyond_array', label: 'Price closes beyond opposing array → bias aligns with break' }
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[styles.listOption, currentSetup.direction.arrayInteraction === option.key && styles.selectedListOption]}
              onPress={() => updateDirection('arrayInteraction', option.key)}
            >
              <Text style={[styles.listOptionText, currentSetup.direction.arrayInteraction === option.key && styles.selectedListOptionText]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>4. Sweep Consideration</Text>
        <CheckboxItem
          label="Candle opens close to previous candle's high/low → expect liquidity sweep (Judas swing)"
          checked={currentSetup.direction.sweepExpected}
          onPress={(value) => updateDirection('sweepExpected', value)}
        />
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>5. Final Outcome</Text>
        <View style={styles.optionRow}>
          {(['bullish', 'bearish', 'no_trade'] as const).map((outcome) => (
            <TouchableOpacity
              key={outcome}
              style={[
                styles.outcomeButton,
                currentSetup.direction.finalOutcome === outcome && styles.selectedOutcome,
                outcome === 'bullish' && currentSetup.direction.finalOutcome === outcome && styles.bullishOutcome,
                outcome === 'bearish' && currentSetup.direction.finalOutcome === outcome && styles.bearishOutcome,
                outcome === 'no_trade' && currentSetup.direction.finalOutcome === outcome && styles.noTradeOutcome
              ]}
              onPress={() => updateDirection('finalOutcome', outcome)}
            >
              <Text style={[styles.outcomeText, currentSetup.direction.finalOutcome === outcome && styles.selectedOutcomeText]}>
                {outcome.replace('_', ' ').toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderStageSection = () => (
    <ScrollView style={styles.sectionContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>STAGE</Text>
        <Text style={styles.sectionSubtitle}>Confirm setup conditions are met</Text>
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>PART 1: THE AREA</Text>
        <CheckboxItem
          label="Price is at a 1H–4H PD Array (minimum) that supports your bias"
          checked={currentSetup.stage.atPDArray}
          onPress={(value) => updateStage('atPDArray', value)}
        />
        <CheckboxItem
          label="OR Price made a run on previous week's/day's high/low"
          checked={currentSetup.stage.stopsRun}
          onPress={(value) => updateStage('stopsRun', value)}
        />
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>PART 2: CISOD (Change in State of Delivery)</Text>
        <Text style={styles.checklistSubtitle}>A 15M–5M displacement that fulfills:</Text>
        
        <CheckboxItem
          label="15M–5M displacement occurred"
          checked={currentSetup.stage.displacementOccurred}
          onPress={(value) => updateStage('displacementOccurred', value)}
        />
        <CheckboxItem
          label="Causes Market Structure Shift OR cuts through opposing FVG"
          checked={currentSetup.stage.mssOrFvgCut}
          onPress={(value) => updateStage('mssOrFvgCut', value)}
        />
        <CheckboxItem
          label="15M and 5M timeframes are aligned (same order flow)"
          checked={currentSetup.stage.timeframesAligned}
          onPress={(value) => updateStage('timeframesAligned', value)}
        />
      </View>

      <View style={styles.gatekeeperSection}>
        <Text style={styles.gatekeeperTitle}>⚠️ GATEKEEPER RULE</Text>
        <View style={styles.gatekeeperContent}>
          <Text style={styles.gatekeeperText}>
            <Text style={styles.gatekeeperBold}>STAGE = TRADE</Text>
            {'\n'}The stage must be met before looking for an entry
          </Text>
          <Text style={styles.gatekeeperText}>
            <Text style={styles.gatekeeperBold}>NO MAN'S LAND = NO TRADE</Text>
            {'\n'}Price between PDAs without stops run = Your entry is a mistake
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderEntrySection = () => (
    <ScrollView style={styles.sectionContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>ENTRY</Text>
        <Text style={styles.sectionSubtitle}>Execute your trading plan</Text>
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>1. Identify Reliable Swing Point</Text>
        <CheckboxItem
          label="Swing point identified (avoid points near unfilled FVGs)"
          checked={currentSetup.entry.swingPointIdentified}
          onPress={(value) => updateEntry('swingPointIdentified', value)}
        />
        <CheckboxItem
          label="After Stop Run / Liquidity Run (Smart Money Reversal)"
          checked={currentSetup.entry.stopRunConfirmed}
          onPress={(value) => updateEntry('stopRunConfirmed', value)}
        />
        <CheckboxItem
          label="After PDA Rejection (Silver Bullet - second phase distribution)"
          checked={currentSetup.entry.pdaRejectionConfirmed}
          onPress={(value) => updateEntry('pdaRejectionConfirmed', value)}
        />
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>2. Apply Fibonacci Retracement</Text>
        <CheckboxItem
          label="Fibonacci applied: 1 Fib on swing point, 0 Fib on displacement end"
          checked={currentSetup.entry.fibonacciApplied}
          onPress={(value) => updateEntry('fibonacciApplied', value)}
        />
        <CheckboxItem
          label="OTE Zone identified: 0.62–0.705 Fib (0.79 occasionally)"
          checked={currentSetup.entry.oteMet}
          onPress={(value) => updateEntry('oteMet', value)}
        />
      </View>

      <View style={styles.checklistSection}>
        <Text style={styles.checklistTitle}>3. Define Entry, Stop Loss & Take Profit</Text>
        <CheckboxItem
          label="Entry trigger set: Price reaches OTE zone + PD Arrays within OTE"
          checked={currentSetup.entry.entryDefined}
          onPress={(value) => updateEntry('entryDefined', value)}
        />
        <CheckboxItem
          label="Stop Loss: Beyond 1 Fib or nearby swing high/low"
          checked={currentSetup.entry.slTpSet}
          onPress={(value) => updateEntry('slTpSet', value)}
        />
        <CheckboxItem
          label="Take Profit: Minimum 0 Fib (R:R >1.5 maintained)"
          checked={currentSetup.entry.rrAcceptable}
          onPress={(value) => updateEntry('rrAcceptable', value)}
        />
      </View>

      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>📋 ENTRY SUMMARY</Text>
        <Text style={styles.summaryText}>
          ENTRY = OTE from a High-Graded Swing Point + PDA
        </Text>
      </View>
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
});