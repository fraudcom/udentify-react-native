#ifdef RCT_NEW_ARCH_ENABLED
#import "RNSSLPinningSpec.h"
@interface SSLPinningModule : NSObject <NativeSSLPinningModule>
#else
#import <React/RCTBridgeModule.h>
@interface SSLPinningModule : NSObject <RCTBridgeModule>
#endif

@end

