#!/bin/bash

# Script to create a test SSL certificate for SSL pinning testing
# This generates a self-signed certificate in DER format

set -e

echo "======================================"
echo "SSL Certificate Generator for Testing"
echo "======================================"
echo ""

# Certificate details
CERT_NAME="test_certificate"
DAYS_VALID=365
SUBJECT="/C=US/ST=State/L=City/O=TestOrg/OU=TestUnit/CN=test.example.com"

echo "Generating test SSL certificate..."
echo "Certificate Name: ${CERT_NAME}"
echo "Valid for: ${DAYS_VALID} days"
echo ""

# Step 1: Generate private key
echo "Step 1: Generating private key..."
openssl genrsa -out ${CERT_NAME}_key.pem 2048 2>/dev/null

# Step 2: Generate certificate
echo "Step 2: Generating certificate..."
openssl req -new -x509 \
  -key ${CERT_NAME}_key.pem \
  -out ${CERT_NAME}.pem \
  -days ${DAYS_VALID} \
  -subj "${SUBJECT}" 2>/dev/null

# Step 3: Convert to DER format
echo "Step 3: Converting to DER format..."
openssl x509 -in ${CERT_NAME}.pem -outform der -out ${CERT_NAME}.cer

# Step 4: Copy to platform directories
echo "Step 4: Copying to platform directories..."

# Create Android assets directory if it doesn't exist
mkdir -p android/app/src/main/assets

# Copy to Android
cp ${CERT_NAME}.cer android/app/src/main/assets/
echo "  ✓ Copied to Android: android/app/src/main/assets/${CERT_NAME}.cer"

# For iOS, just inform the user
echo "  ℹ For iOS: Add ${CERT_NAME}.cer to Xcode project manually"

# Clean up PEM files (keep only .cer)
rm ${CERT_NAME}_key.pem ${CERT_NAME}.pem

echo ""
echo "======================================"
echo "✓ Certificate created successfully!"
echo "======================================"
echo ""
echo "Files created:"
echo "  - ${CERT_NAME}.cer (DER format)"
echo ""
echo "Android setup: ✓ COMPLETE"
echo "  Certificate copied to: android/app/src/main/assets/"
echo ""
echo "iOS setup: MANUAL STEP REQUIRED"
echo "  1. Open ios/testapp.xcworkspace in Xcode"
echo "  2. Drag ${CERT_NAME}.cer into the project"
echo "  3. Check 'Copy items if needed'"
echo "  4. Ensure it's added to your app target"
echo ""
echo "Certificate details:"
openssl x509 -in ${CERT_NAME}.cer -inform der -text -noout | head -20
echo ""
echo "Ready to test! Run:"
echo "  npm install"
echo "  cd ios && pod install && cd .."
echo "  npx react-native run-ios --device \"Your Device\""
echo "  npx react-native run-android --device"
echo ""

