//
//  NFCModule.h
//  NFCLibrary
//
//  Created by React Native on 01/01/25.
//

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNNFCLibrarySpec.h"
@interface NFCModule : RCTEventEmitter <NativeNFCModuleSpec>
#else
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
@interface NFCModule : RCTEventEmitter <RCTBridgeModule>
#endif

@end
