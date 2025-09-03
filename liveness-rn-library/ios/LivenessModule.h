//
//  LivenessModule.h
//  liveness-rn-library
//
//  Created by Liveness RN Library on 2024-01-01.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNLivenessLibrarySpec.h"

@interface LivenessModule : RCTEventEmitter <NativeLivenessModuleSpec>
#else
@interface LivenessModule : RCTEventEmitter <RCTBridgeModule>
#endif

@end
