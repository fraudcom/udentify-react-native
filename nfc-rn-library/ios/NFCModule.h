#ifdef RCT_NEW_ARCH_ENABLED
#import "RNNFCLibrarySpec.h"
@interface NFCModule : RCTEventEmitter <NativeNFCModuleSpec>
#else
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
@interface NFCModule : RCTEventEmitter <RCTBridgeModule>
#endif

@end
