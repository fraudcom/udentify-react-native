#ifdef RCT_NEW_ARCH_ENABLED
#import "RNOCRLibrarySpec.h"
@interface OCRModule : NSObject <NativeOCRModuleSpec>
#else
#import <React/RCTBridgeModule.h>
@interface OCRModule : NSObject <RCTBridgeModule>
#endif

@end
