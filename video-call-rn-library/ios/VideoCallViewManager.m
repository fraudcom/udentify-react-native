//  VideoCallViewManager.m
//  video-call-rn-library
//  Objective-C bridge that registers the Swift VideoCallViewManager with
//  React Native and exposes its props. Registered component name is

#import <React/RCTViewManager.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTUIManager.h>

@interface RCT_EXTERN_MODULE(VideoCallViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(credentials, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(config, NSDictionary)

@end
