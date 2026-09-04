#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <React/RCTEventEmitter.h>
#else
#import <React/RCTEventEmitter.h>
#endif

@interface LocalizationModule : NSObject <RCTBridgeModule>

@end


