require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name           = "liveness-rn-library"
  s.version        = package["version"]
  s.summary        = package["description"]
  s.homepage       = package["homepage"]
  s.license        = package["license"]
  s.authors        = package["author"]

  s.platforms      = { :ios => "11.0" }
  s.source         = { :git => "https://github.com/example/liveness-rn-library.git", :tag => "#{s.version}" }

  s.source_files   = "ios/**/*.{h,m,mm,swift}"
  s.public_header_files = "ios/**/*.h"
  s.requires_arc   = true
  s.swift_version  = "5.0"
  
  # Dependencies
  s.dependency "React-Core"
  s.dependency "udentify-core"  # Shared core framework dependency (provides UdentifyCommons)

  # Configure build settings
  base_config = {
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'DEFINES_MODULE' => 'YES',
    'SWIFT_OBJC_INTERFACE_HEADER_NAME' => 'liveness_rn_library-Swift.h',
    'PRODUCT_MODULE_NAME' => 'liveness_rn_library'
  }

  # New Architecture
  if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
    base_config.merge!({
        "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/boost\"",
        "OTHER_CPLUSPLUSFLAGS" => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32",
        "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
    })
    s.dependency "React-Codegen"
    s.dependency "ReactCommon/turbomodule/core"
  end

  s.pod_target_xcconfig = base_config

  # Frameworks for Udentify Face SDK 
  # Only Face-specific frameworks (UdentifyCommons provided by udentify-core)
  s.vendored_frameworks = [
    "ios/Frameworks/UdentifyFACE.xcframework",
    "ios/Frameworks/Lottie.xcframework"
  ]

  # Resources - Use resources instead of resource_bundles for direct access
  s.resources = [
    'ios/Resources/**/*'
  ]
  
  # Framework search paths and module configuration
  s.xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => '"$(PODS_ROOT)/liveness-rn-library/ios/Frameworks"',
    'HEADER_SEARCH_PATHS' => '"$(PODS_ROOT)/liveness-rn-library/ios/Frameworks/UdentifyFACE.xcframework/ios-arm64/UdentifyFACE.framework/Headers"',
    'SWIFT_INCLUDE_PATHS' => '"$(PODS_ROOT)/liveness-rn-library/ios/Frameworks/UdentifyFACE.xcframework/ios-arm64/UdentifyFACE.framework/Modules"'
  }
end
