#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNLivenessLibrarySpec.h"

@interface LivenessModule : RCTEventEmitter <NativeLivenessModuleSpec>
#else
@interface LivenessModule : RCTEventEmitter <RCTBridgeModule>
#endif

@end
