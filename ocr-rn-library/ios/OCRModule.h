#ifdef RCT_NEW_ARCH_ENABLED
#import "RNOCRLibrarySpec.h"
@interface OCRModule : RCTEventEmitter <NativeOCRModuleSpec>
#else
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
@interface OCRModule : RCTEventEmitter <RCTBridgeModule>
#endif

@end
