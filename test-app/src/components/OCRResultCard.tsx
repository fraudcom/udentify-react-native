import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

interface ExtractedData {
  motherName?: string;
  identityNo?: string;
  firstName?: string;
  documentNumber?: string;
  hasPhoto?: boolean;
  hasSignature?: boolean;
  documentIssuer?: string;
  nationality?: string;
  lastName?: string;
  fatherName?: string;
  birthDate?: string;
  countryCode?: string;
  isDocumentExpired?: boolean;
  expiryDate?: string;
  gender?: string;
  isIDValid?: boolean;
}

interface OCRResult {
  success: boolean;
  documentType: string;
  extractedData: ExtractedData;
  timestamp: number;
  transactionID: string;
}

interface OCRResultCardProps {
  result: OCRResult;
}

const OCRResultCard: React.FC<OCRResultCardProps> = ({ result }) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatFieldName = (fieldName: string) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const renderField = (key: string, value: any) => {
    if (value === undefined || value === null || value === '') return null;
    
    let displayValue: string;
    if (typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    } else {
      displayValue = String(value);
    }

    return (
      <View key={key} style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{formatFieldName(key)}:</Text>
        <Text style={styles.fieldValue}>{displayValue}</Text>
      </View>
    );
  };

  const getStatusColor = () => {
    if (!result.success) return '#dc3545'; // Red for failure
    if (result.extractedData.isIDValid === false) return '#ffc107'; // Yellow for invalid ID
    return '#28a745'; // Green for success
  };

  const getStatusText = () => {
    if (!result.success) return 'Failed';
    if (result.extractedData.isIDValid === false) return 'Invalid Document';
    return 'Success';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>OCR Result</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            {result.documentType} • {formatDate(result.timestamp)}
          </Text>
          <Text style={styles.transactionId}>
            Transaction ID: {result.transactionID}
          </Text>
        </View>

        {/* Document Information */}
        {result.success && result.extractedData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Extracted Information</Text>
            
            {/* Personal Information */}
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Personal Details</Text>
              {renderField('firstName', result.extractedData.firstName)}
              {renderField('lastName', result.extractedData.lastName)}
              {renderField('identityNo', result.extractedData.identityNo)}
              {renderField('birthDate', result.extractedData.birthDate)}
              {renderField('gender', result.extractedData.gender)}
              {renderField('nationality', result.extractedData.nationality)}
              {renderField('countryCode', result.extractedData.countryCode)}
            </View>

            {/* Family Information */}
            {(result.extractedData.fatherName || result.extractedData.motherName) && (
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Family Information</Text>
                {renderField('fatherName', result.extractedData.fatherName)}
                {renderField('motherName', result.extractedData.motherName)}
              </View>
            )}

            {/* Document Details */}
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Document Details</Text>
              {renderField('documentNumber', result.extractedData.documentNumber)}
              {renderField('documentIssuer', result.extractedData.documentIssuer)}
              {renderField('expiryDate', result.extractedData.expiryDate)}
              {renderField('isDocumentExpired', result.extractedData.isDocumentExpired)}
              {renderField('isIDValid', result.extractedData.isIDValid)}
            </View>

            {/* Document Features */}
            <View style={styles.subsection}>
              <Text style={styles.subsectionTitle}>Document Features</Text>
              {renderField('hasPhoto', result.extractedData.hasPhoto)}
              {renderField('hasSignature', result.extractedData.hasSignature)}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  card: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212529',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  transactionId: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: 'monospace',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  subsection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingBottom: 4,
  },
  fieldContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 2,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    flex: 1,
  },
  fieldValue: {
    fontSize: 14,
    color: '#212529',
    flex: 1,
    textAlign: 'right',
    fontWeight: '400',
  },
});

export default OCRResultCard;
