import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';

interface PlaceholderTabProps {
  title: string;
  description?: string;
}

const PlaceholderTab: React.FC<PlaceholderTabProps> = ({ 
  title, 
  description = 'This tab will be implemented in the future.' 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default PlaceholderTab;
