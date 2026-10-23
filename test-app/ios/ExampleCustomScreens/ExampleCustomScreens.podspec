Pod::Spec.new do |s|
  s.name         = "ExampleCustomScreens"
  s.version      = "1.0.0"
  s.summary      = "Example custom LiveKYC screens for the test app. Off unless switched on in Settings."
  s.homepage     = "https://github.com/fraudcom/udentify-react"
  s.license      = { :type => "MIT" }
  s.authors      = "Fraud.com"

  s.platforms    = { :ios => "15.1" }
  s.source       = { :git => "https://github.com/fraudcom/udentify-react.git", :tag => "#{s.version}" }

  s.source_files = "*.{h,m,swift}"
  s.resource_bundles = { 'ExampleCustomScreensResources' => ['Resources/**/*.lproj/*.strings'] }
  s.requires_arc = true
  s.swift_version = "5.0"

  s.dependency "React-Core"
  s.dependency "udentify-core"
  s.dependency "ocr-rn-library"
  s.dependency "liveness-rn-library"
  s.dependency "nfc-rn-library"
  s.dependency "video-call-rn-library"

  s.pod_target_xcconfig = {
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'DEFINES_MODULE' => 'YES'
  }

  # The Udentify xcframeworks live in the packages above; CocoaPods picks the slice.
  s.xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => '"$(PODS_ROOT)/udentify-core/ios/Frameworks" "$(PODS_ROOT)/ocr-rn-library/ios/Frameworks" "$(PODS_ROOT)/liveness-rn-library/ios/Frameworks" "$(PODS_ROOT)/nfc-rn-library/ios/Frameworks" "$(PODS_ROOT)/video-call-rn-library/ios/Frameworks"'
  }
end
