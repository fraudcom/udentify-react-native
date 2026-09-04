#ifdef RCT_NEW_ARCH_ENABLED
#import "RNVideoCallLibrarySpec.h"
@interface VideoCallModule : RCTEventEmitter <NativeVideoCallModuleSpec>
#else
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
@interface VideoCallModule : RCTEventEmitter <RCTBridgeModule>
#endif

@end
