#ifdef RCT_NEW_ARCH_ENABLED
#import "RNMRZLibrarySpec.h"
@interface MRZModule : RCTEventEmitter <NativeMRZModuleSpec>
#else
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
@interface MRZModule : RCTEventEmitter <RCTBridgeModule>
#endif

@end
