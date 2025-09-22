require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name           = "mrz-rn-library"
  s.version        = package["version"]
  s.summary        = package["description"]
  s.homepage       = package["homepage"]
  s.license        = package["license"]
  s.authors        = package["author"]

  s.platforms      = { :ios => "11.0" }
  s.source         = { :git => "https://github.com/example/mrz-rn-library.git", :tag => "#{s.version}" }

  s.source_files   = "ios/**/*.{h,m,mm,swift}"
  s.resource_bundles = {
    'MRZLibraryResources' => ['ios/Resources/**/*']
  }
  s.requires_arc   = true
  s.swift_version  = "5.0"
  
  # Dependencies
  s.dependency "React-Core"
  s.dependency "udentify-core"  # Shared core framework dependency

  # Configure build settings based on Udentify documentation
  base_config = {
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'DEFINES_MODULE' => 'YES',
    'SWIFT_OBJC_INTERFACE_HEADER_NAME' => 'mrz_rn_library-Swift.h',
    'PRODUCT_MODULE_NAME' => 'mrz_rn_library',
    'OTHER_LDFLAGS' => '-ObjC -lc++',
    'ENABLE_BITCODE' => 'NO',          # Disable Bitcode as per docs
    'SKIP_INSTALL' => 'YES',           # Skip Install as per docs
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17',
    'CLANG_CXX_LIBRARY' => 'libc++',
    'GCC_C_LANGUAGE_STANDARD' => 'c11'
  }

  # New Architecture
  if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
    s.pod_target_xcconfig = base_config.merge({
        "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/boost\"",
        "OTHER_CPLUSPLUSFLAGS" => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1",
        "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
    })
    s.dependency "React-Codegen"
    s.dependency "ReactCommon/turbomodule/core"
  else
    s.pod_target_xcconfig = base_config
  end

  # Conditional framework configuration based on whether frameworks exist
  # This allows the plugin to work with or without the Udentify frameworks
  
  # Check if main MRZ framework exists
  frameworks_path = File.join(__dir__, 'ios/Frameworks')
  udentify_mrz_exists = File.exist?(File.join(frameworks_path, 'UdentifyMRZ.xcframework'))
  
  if udentify_mrz_exists
    # Include all frameworks but exclude problematic C++ headers from compilation
    s.vendored_frameworks = [
      'ios/Frameworks/UdentifyMRZ.xcframework',
      'ios/Frameworks/GPUImage.xcframework',
      'ios/Frameworks/TesseractOCRSDKiOS.xcframework'
    ]
    
    # Exclude C++ private headers from compilation to prevent conflicts
    s.exclude_files = [
      'ios/Frameworks/TesseractOCRSDKiOS.xcframework/**/PrivateHeaders/**',
      'ios/Frameworks/TesseractOCRSDKiOS.xcframework/**/*{.hpp,.cpp,.cc,.cxx}'
    ]
    
    # Framework will be automatically detected via canImport in Swift code
    
    puts "✅ MRZ RN Library: UdentifyMRZ framework detected - enabling full SDK functionality"
    puts "✅ MRZ RN Library: All frameworks properly linked with C++ headers excluded from compilation"
  else
    # Framework missing - plugin will work in placeholder mode
    puts "⚠️  MRZ RN Library: Missing UdentifyMRZ.xcframework"
    puts "ℹ️  MRZ RN Library: Plugin will work in placeholder mode - add UdentifyMRZ.xcframework to ios/Frameworks/"
  end
  
  # Add framework search paths and C++ compilation settings
  s.xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => [
      '"$(PODS_ROOT)/mrz-rn-library/ios/Frameworks"',
      '"$(BUILT_PRODUCTS_DIR)/mrz-rn-library"',
      '"$(PODS_TARGET_SRCROOT)/ios/Frameworks"'
    ].join(' '),
    'OTHER_LDFLAGS' => '-ObjC',
    # Control header exposure to prevent C++ conflicts
    'USER_HEADER_SEARCH_PATHS' => '"$(PODS_ROOT)/mrz-rn-library/ios"',
    'HEADER_SEARCH_PATHS' => '"$(PODS_ROOT)/mrz-rn-library/ios"',
    # Hide problematic private headers
    'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => '',
    'VALID_ARCHS' => 'arm64 x86_64'
  }

end
