import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';

interface Tab {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  props?: any;
}

interface TabNavigatorProps {
  tabs: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

const TabNavigator: React.FC<TabNavigatorProps> = ({ tabs, activeTab: controlledActiveTab, onTabChange }) => {
  const [internalActiveTab, setInternalActiveTab] = useState(tabs[0]?.id || '');
  
  // Use controlled active tab if provided, otherwise use internal state
  const activeTab = controlledActiveTab || internalActiveTab;

  const handleTabPress = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      setInternalActiveTab(tabId);
    }
  };

  const renderTabButton = (tab: Tab) => {
    const isActive = activeTab === tab.id;
    return (
      <TouchableOpacity
        key={tab.id}
        style={[styles.tabButton, isActive && styles.activeTabButton]}
        onPress={() => handleTabPress(tab.id)}
      >
        <Text style={[styles.tabText, isActive && styles.activeTabText]}>
          {tab.title}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderActiveContent = () => {
    const activeTabConfig = tabs.find(tab => tab.id === activeTab);
    if (!activeTabConfig) return null;
    
    const ActiveComponent = activeTabConfig.component;
    const tabProps = activeTabConfig.props || {};
    return <ActiveComponent {...tabProps} />;
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map(renderTabButton)}
      </View>
      <View style={styles.content}>
        {renderActiveContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#007bff',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6c757d',
  },
  activeTabText: {
    color: '#007bff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});

export default TabNavigator;
