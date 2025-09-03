#!/usr/bin/env node

/**
 * Android UI Customization Helper
 * 
 * This script helps update Android XML resources for UdentifyFACE SDK UI customization.
 * Since Android doesn't support dynamic UI changes, we need to update XML files.
 */

const fs = require('fs');
const path = require('path');

// Paths to Android resource files
const COLORS_XML_PATH = './test-app/android/app/src/main/res/values/colors.xml';
const DIMENS_XML_PATH = './test-app/android/app/src/main/res/values/dimens.xml';
const STRINGS_XML_PATH = './test-app/android/app/src/main/res/values/strings.xml';

/**
 * Update colors.xml with new color values
 */
function updateColorsXML(colors) {
    console.log('📁 Updating colors.xml...');
    
    let colorsXML = fs.readFileSync(COLORS_XML_PATH, 'utf8');
    
    // Update each color if provided
    Object.entries(colors).forEach(([key, value]) => {
        const colorMappings = {
            'buttonColor': 'udentifyface_btn_color',
            'buttonSuccessColor': 'udentifyface_btn_color_success',
            'buttonErrorColor': 'udentifyface_btn_color_error',
            'buttonTextColor': 'udentifyface_btn_text_color',
            'buttonSuccessTextColor': 'udentifyface_btn_text_color_success',
            'buttonErrorTextColor': 'udentifyface_btn_text_color_error',
            'backgroundColor': 'udentifyface_bg_color',
            'gestureTextBackgroundColor': 'udentifyface_gesture_text_bg_color'
        };
        
        const xmlColorName = colorMappings[key];
        if (xmlColorName && value) {
            const regex = new RegExp(`(<color name="${xmlColorName">)[^<]*(</color>)`, 'g');
            colorsXML = colorsXML.replace(regex, `$1${value}$2`);
            console.log(`   ✅ Updated ${xmlColorName}: ${value}`);
        }
    });
    
    fs.writeFileSync(COLORS_XML_PATH, colorsXML);
    console.log('✅ colors.xml updated successfully');
}

/**
 * Update dimens.xml with new dimension values
 */
function updateDimensXML(dimensions) {
    console.log('📁 Updating dimens.xml...');
    
    let dimensXML = fs.readFileSync(DIMENS_XML_PATH, 'utf8');
    
    // Update each dimension if provided
    Object.entries(dimensions).forEach(([key, value]) => {
        const dimensionMappings = {
            'buttonHeight': 'udentify_selfie_button_height',
            'buttonCornerRadius': 'udentify_face_selfie_button_corner_radius',
            'gestureFontSize': 'udentifyface_gesture_font_size',
            'buttonMarginLeft': 'udentify_selfie_button_horizontal_margin',
            'buttonMarginRight': 'udentify_selfie_button_horizontal_margin'
        };
        
        const xmlDimenName = dimensionMappings[key];
        if (xmlDimenName && value) {
            const unit = key.includes('Font') ? 'sp' : 'dp';
            const regex = new RegExp(`(<dimen name="${xmlDimenName">)[^<]*(</dimen>)`, 'g');
            dimensXML = dimensXML.replace(regex, `$1${value}${unit}$2`);
            console.log(`   ✅ Updated ${xmlDimenName}: ${value}${unit}`);
        }
    });
    
    fs.writeFileSync(DIMENS_XML_PATH, dimensXML);
    console.log('✅ dimens.xml updated successfully');
}

/**
 * Main function to update UI configuration
 */
function updateAndroidUI(config) {
    console.log('🔧 ========== UPDATING ANDROID UI RESOURCES ==========');
    console.log('📝 Configuration:', JSON.stringify(config, null, 2));
    console.log('');
    
    try {
        // Update colors if provided
        if (config.colors) {
            updateColorsXML(config.colors);
        }
        
        // Update dimensions if provided
        if (config.dimensions) {
            updateDimensXML(config.dimensions);
        }
        
        console.log('');
        console.log('✅ Android UI resources updated successfully!');
        console.log('⚡ Run "npm run android" to rebuild with new UI');
        console.log('=====================================================');
        
    } catch (error) {
        console.error('❌ Failed to update Android UI resources:', error.message);
        process.exit(1);
    }
}

// Example usage
if (require.main === module) {
    // Example configuration
    const exampleConfig = {
        colors: {
            buttonColor: '#FF6B35',
            backgroundColor: '#2C3E50',
            buttonTextColor: '#FFFFFF'
        },
        dimensions: {
            buttonHeight: 56,
            buttonCornerRadius: 12,
            gestureFontSize: 24
        }
    };
    
    console.log('📱 Android UI Customization Helper');
    console.log('This script will update XML resources for UdentifyFACE SDK');
    console.log('');
    
    if (process.argv[2] === '--example') {
        updateAndroidUI(exampleConfig);
    } else {
        console.log('Usage:');
        console.log('  node update-android-ui.js --example    # Run with example config');
        console.log('  Or modify this script to use your config');
    }
}

module.exports = { updateAndroidUI };
