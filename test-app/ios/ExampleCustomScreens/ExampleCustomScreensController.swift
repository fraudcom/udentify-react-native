import Foundation
import UdentifyLiveKYC

/// Example custom screens for the OCR, NFC and Face redos, off unless switched on.
/// OCR gets its own flow; Face and NFC get listeners that draw a banner, because
/// the Face capture and the NFC sheet themselves are not replaceable here.
@objc(ExampleCustomScreensController)
public final class ExampleCustomScreensController: NSObject {

    private static let ocrFlow = ExampleOCRFlow()
    private static let faceOverlay = ExampleFaceOverlay()
    private static let nfcOverlay = ExampleNFCOverlay()
    private static var active = false
    private static var previousFace: AnyObject?
    private static var previousNFC: AnyObject?

    /// Returns the roles the example screens now cover. `language` is the app's language setting.
    @objc public static func setEnabled(_ enabled: Bool, language: String?) -> [String] {
        if enabled {
            ExampleStrings.language = language
            if !active {
                previousFace = LiveKYCSettings.faceListener
                previousNFC = LiveKYCSettings.nfcListener
                active = true
            }
            LiveKYCCoordinator.shared.registerHandler(.ocr, handler: ocrFlow)
            LiveKYCSettings.faceListener = faceOverlay
            LiveKYCSettings.nfcListener = nfcOverlay
            return ["OCR", "FACE", "NFC"]
        }
        LiveKYCCoordinator.shared.unregisterHandler(.ocr)
        ocrFlow.release()
        // Put back what was there, unless something else has replaced ours since.
        if LiveKYCSettings.faceListener === faceOverlay { LiveKYCSettings.faceListener = previousFace }
        if LiveKYCSettings.nfcListener === nfcOverlay { LiveKYCSettings.nfcListener = previousNFC }
        previousFace = nil
        previousNFC = nil
        active = false
        return []
    }
}
