#ifdef RCT_NEW_ARCH_ENABLED
#import "RNMRZLibrarySpec.h"
@interface MRZModule : NSObject <NativeMRZModuleSpec>
#else
#import <React/RCTBridgeModule.h>
@interface MRZModule : NSObject <RCTBridgeModule>
#endif

@end
