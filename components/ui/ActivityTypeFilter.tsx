import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ActivityTypeFilterProps {
  selectedType: 'created' | 'joined';
  onTypeChange: (type: 'created' | 'joined') => void;
  createdCount?: number;
  joinedCount?: number;
  style?: any;
}

const PRIMARY_COLOR = '#0C3B2E';

export const ActivityTypeFilter: React.FC<ActivityTypeFilterProps> = ({
  selectedType,
  onTypeChange,
  createdCount = 0,
  joinedCount = 0,
  style,
}) => {
  const tabs = [
    { id: 'created', label: "J'organise", count: createdCount },
    { id: 'joined', label: 'Je participe', count: joinedCount },
  ];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              selectedType === tab.id && styles.activeTab,
            ]}
            onPress={() => onTypeChange(tab.id as 'created' | 'joined')}
          >
            <Text
              style={[
                styles.tabText,
                selectedType === tab.id && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  activeTabText: {
    color: '#FFF',
  },
});
