//
//  MrzCameraViewManager.m
//  MRZLibrary
//
//  Objective-C bridge that registers the Swift MrzCameraViewManager with
//  React Native and exposes its props / events.
//

#import <React/RCTViewManager.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTUIManager.h>

@interface RCT_EXTERN_MODULE(MrzCameraViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(onMrzDetected, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onMrzError, RCTBubblingEventBlock)

RCT_EXPORT_VIEW_PROPERTY(focusViewBorderColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(focusViewStrokeWidth, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(paused, BOOL)

@end
