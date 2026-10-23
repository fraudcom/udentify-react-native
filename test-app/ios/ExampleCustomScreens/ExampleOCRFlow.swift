import UIKit
import UdentifyCommons
import UdentifyLiveKYC
import UdentifyOCR

/// Example own OCR flow: the SDK's camera captures each side, but the quality check and its
/// Use / Retake / Cancel screen are ours, kept up under the camera for the whole step. It
/// reports exactly one outcome, and the OCR result also feeds a later NFC redo.
final class ExampleOCRFlow: NSObject, LiveKYCRepeatHandler, OCRCameraControllerDelegate {

    private var screen: ExampleQualityViewController?
    private var params: LiveKYCRepeatParams?
    private var callback: LiveKYCRepeatCallback?
    private var savedSettings: (any OCRSettings)?
    private var sides: [OCRDocumentSide] = []
    private var currentSide: OCRDocumentSide = .frontSide
    private var photos: (front: UIImage?, back: UIImage?) = (nil, nil)
    private var reported = false

    func handleRepeat(presenter: UIViewController, params: LiveKYCRepeatParams,
                      callback: LiveKYCRepeatCallback) {
        // A redo the SDK ended without telling us would leave our settings installed.
        restoreSettings()
        self.params = params
        self.callback = callback
        reported = false
        photos = (nil, nil)
        sides = requestedSides(params)
        currentSide = sides[0]
        let screen = ExampleQualityViewController(title: ExampleStrings.own("example_ocr_title"))
        screen.showStatus(ExampleStrings.own("example_opening_camera"))
        self.screen = screen
        presenter.present(screen, animated: false) { [weak self] in self?.presentCamera() }
    }

    // MARK: - Capture

    private func presentCamera() {
        DispatchQueue.main.async { [self] in
            guard let params else { return }
            useOwnQualityCheck()
            guard let camera = OCRCameraViewController.instantiate(
                withApiCallDisabled: self,
                serverURL: params.serverURL,
                transactionID: params.transactionID,
                documentType: documentType(params),
                country: params.country,
                documentSide: currentSide) else {
                finish { $0.onRepeatFailed("OCR camera unavailable") }
                return
            }
            // The agent watches this camera in cameraFeed mode.
            camera.setCameraFeedFrameHandler(params.cameraFeedFrameHandler)
            camera.modalPresentationStyle = .overFullScreen
            screen?.present(camera, animated: true)
        }
    }

    func onDocumentScan(for side: OCRDocumentSide, payload: DocumentScanPayload,
                        croppedImages: (front: UIImage?, back: UIImage?)) {
        guard case .images(let front, let back) = payload,
              let image = (currentSide == .backSide ? back : front) ?? front ?? back else {
            finish { $0.onRepeatFailed("OCR capture returned no image") }
            return
        }
        screen?.showStatus(sdk("udentify_iqa_screen_title", "Checking image quality"))
        runQualityCheck(image, side: currentSide) { [self] verdict in
            showResult(image, verdict: verdict)
        }
    }

    func onBackButtonPressed(at controllerType: ControllerType) {
        finish { $0.onRepeatCancelled() }
    }

    func onFailure(error: Error) {
        finish { $0.onRepeatFailed(error.localizedDescription) }
    }

    func didDismiss(controllerType: ControllerType) {
        restoreSettings()
    }

    // MARK: - Our own quality check and result screen, after each side

    private func runQualityCheck(_ image: UIImage, side: OCRDocumentSide,
                                 done: @escaping ((qualified: Bool, message: String)) -> Void) {
        guard let params else { return }
        DispatchQueue.main.async { [self] in
            OCRCameraViewController.performIQA(
                serverURL: params.serverURL,
                transactionID: params.transactionID,
                image: image,
                forCountry: params.country ?? .TUR,
                forDocumentType: documentType(params),
                forDocumentSide: side) { result in
                DispatchQueue.main.async {
                    switch result {
                    case .success(let response):
                        done((response.qualified, response.displayMessage))
                    case .failure(let error):
                        done((false, ExampleStrings.own("example_quality_failed", error.localizedDescription)))
                    }
                }
            }
        }
    }

    private func showResult(_ image: UIImage, verdict: (qualified: Bool, message: String)) {
        screen?.showResult(
            lines: [verdictText(verdict)],
            canUse: verdict.qualified,
            titles: (use: sdk("udentify_ocr_button_use_title", "Use"),
                     retake: sdk("udentify_ocr_button_retake_title", "Retake"),
                     cancel: ExampleStrings.own("example_cancel")),
            onUse: { [weak self] in self?.accept(image) },
            onRetake: { [weak self] in self?.presentCamera() },
            onCancel: { [weak self] in self?.finish { $0.onRepeatCancelled() } })
    }

    /// Keeps the accepted side, then captures the next one or sends the OCR request.
    private func accept(_ image: UIImage) {
        if currentSide == .backSide { photos.back = image } else { photos.front = image }
        if let index = sides.firstIndex(of: currentSide), index + 1 < sides.count {
            currentSide = sides[index + 1]
            screen?.showStatus(ExampleStrings.own("example_opening_camera_back"))
            presentCamera()
        } else {
            screen?.showStatus(ExampleStrings.own("example_sending_ocr"))
            runOCR()
        }
    }

    private func runOCR() {
        guard let params else { return }
        DispatchQueue.main.async { [self] in
            OCRCameraViewController.performOCR(
                serverURL: params.serverURL,
                transactionID: params.transactionID,
                frontSidePhoto: photos.front,
                backSidePhoto: photos.back,
                country: params.country,
                documentType: documentType(params)) { response, error in
                if let response {
                    self.finish { $0.onRepeatCompleted(response) }
                } else {
                    self.finish { $0.onRepeatFailed(error?.localizedDescription ?? "OCR failed") }
                }
            }
        }
    }

    // MARK: - Helpers

    /// An SDK string by key, from the OCR texts the app configured.
    private func sdk(_ key: String, _ fallback: String) -> String {
        let configs = (savedSettings ?? OCRSettingsProvider.getInstance().currentSettings).configs
        return ExampleStrings.sdk(key, in: configs.bundle, table: configs.tableName, fallback: fallback)
    }

    /// The SDK's own "front side passed" / "back side quality check failed" title, then the server's message.
    private func verdictText(_ verdict: (qualified: Bool, message: String)) -> String {
        let part = currentSide == .backSide ? "back" : "front"
        let fallback = (currentSide == .backSide ? "Back side " : "Front side ")
            + (verdict.qualified ? "passed" : "quality check failed")
        let title = sdk("udentify_iqa_\(part)_capture_quality_\(verdict.qualified ? "success" : "failed")_title", fallback)
        return verdict.message.isEmpty ? title : "\(title)\n\(verdict.message)"
    }

    /// Our quality check replaces the SDK's, so the camera must hand back plain images.
    private func useOwnQualityCheck() {
        let provider = OCRSettingsProvider.getInstance()
        if savedSettings == nil { savedSettings = provider.currentSettings }
        provider.currentSettings = OwnQualityCheckSettings(base: provider.currentSettings)
    }

    /// Puts the app's OCR settings back; also called when the examples are switched off.
    func release() { restoreSettings() }

    private func restoreSettings() {
        guard let saved = savedSettings else { return }
        OCRSettingsProvider.getInstance().currentSettings = saved
        savedSettings = nil
    }

    private func finish(_ report: (LiveKYCRepeatCallback) -> Void) {
        restoreSettings()
        guard !reported, let callback else { return }
        reported = true
        report(callback)
    }

    private func documentType(_ params: LiveKYCRepeatParams) -> OCRDocumentType {
        params.documentType.flatMap { OCRDocumentType(rawValue: $0.rawValue) } ?? .ID_CARD
    }

    /// The sides to capture one by one: what the agent asked for, and only the front for a passport.
    private func requestedSides(_ params: LiveKYCRepeatParams) -> [OCRDocumentSide] {
        if documentType(params) == .PASSPORT { return [.frontSide] }
        switch params.documentSide {
        case .frontSide: return [.frontSide]
        case .backSide: return [.backSide]
        default: return [.frontSide, .backSide]
        }
    }
}

/// Only the app's language bundle and table carry over; the rest are the SDK's defaults, with its own quality check off.
private struct OwnQualityCheckSettings: OCRSettings {
    let base: any OCRSettings
    var configs: OCRConfigs {
        OCRConfigs(bundle: base.configs.bundle, tableName: base.configs.tableName,
                   isIQAServiceEnabled: false)
    }
}
