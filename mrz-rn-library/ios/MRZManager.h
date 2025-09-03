#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

@interface MRZManager : NSObject

- (void)checkPermissions:(void (^)(BOOL hasPermission))completion;
- (void)requestPermissions:(void (^)(NSString *status))completion;
- (void)startMrzCamera:(NSDictionary * _Nullable)customization completion:(void (^)(NSDictionary *result))completion;
- (void)processMrzImage:(NSString *)imageBase64 completion:(void (^)(NSDictionary *result))completion;
- (void)cancelMrzScanning:(void (^)(void))completion;

@end
