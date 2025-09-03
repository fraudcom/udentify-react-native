//
//  NFCModule.h
//  NFCLibrary
//
//  Created by React Native on 01/01/25.
//

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNNFCLibrarySpec.h"
@interface NFCModule : NSObject <NativeNFCModuleSpec>
#else
#import <React/RCTBridgeModule.h>
@interface NFCModule : NSObject <RCTBridgeModule>
#endif

@end
