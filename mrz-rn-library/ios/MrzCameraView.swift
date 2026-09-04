//
//  MrzCameraView.swift
//  MRZLibrary
//
//  Inline MRZ camera view for React Native. Renders MRZ SDK camera preview
//  inside the view hierarchy so JS overlays can sit on top of it.
//  Does not replace the modal `startMrzCamera` flow.
//

import Foundation
import UIKit
import AVFoundation

#if canImport(UdentifyMRZ)
import UdentifyMRZ
#endif
#if canImport(UdentifyCommons)
import UdentifyCommons
#endif

@objc(MrzCameraView)
public class MrzCameraView: UIView {

    // MARK: - RN event blocks

    @objc public var onMrzDetected: RCTBubblingEventBlock?
    @objc public var onMrzError: RCTBubblingEventBlock?

    // MARK: - RN props

    @objc public var focusViewBorderColor: NSString = "#4ECBA6" {
        didSet { needsRestart = true; restartIfActive() }
    }
    @objc public var focusViewStrokeWidth: NSNumber = 2 {
        didSet { needsRestart = true; restartIfActive() }
    }
    @objc public var paused: Bool = false {
        didSet { applyPaused() }
    }

    // MARK: - Internal

    private let previewContainer = UIView()
    private let focusView = UIView()

    #if canImport(UdentifyMRZ) && canImport(UdentifyCommons)
    private var mrzCameraController: MRZCameraController?
    #endif

    private var didStart = false
    private var didSucceed = false
    private var needsRestart = false

    // MARK: - Init

    override init(frame: CGRect) {
        super.init(frame: frame)
        commonInit()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        commonInit()
    }

    private func commonInit() {
        backgroundColor = .black
        previewContainer.backgroundColor = .black
        previewContainer.frame = bounds
        previewContainer.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        addSubview(previewContainer)

        focusView.backgroundColor = .clear
        addSubview(focusView)
    }

    // MARK: - Layout / lifecycle

    public override func layoutSubviews() {
        super.layoutSubviews()
        previewContainer.frame = bounds

        // Default focus rect: roughly horizontal band near the bottom third.
        // The JS overlay is responsible for visual guidance; this rect only
        // governs where the SDK looks for MRZ text.
        let horizontalMargin: CGFloat = 20
        let width = max(bounds.width - horizontalMargin * 2, 0)
        let height = max(min(bounds.height * 0.18, 120), 60)
        let y = bounds.height * 0.60
        focusView.frame = CGRect(x: horizontalMargin, y: y, width: width, height: height)

        startIfReady()
    }

    public override func didMoveToWindow() {
        super.didMoveToWindow()
        if window == nil {
            teardown()
        } else {
            startIfReady()
        }
    }

    deinit {
        teardown()
    }

    // MARK: - Start / stop

    private func startIfReady() {
        guard !didStart else { return }
        guard window != nil, bounds.width > 0, bounds.height > 0 else { return }
        guard focusView.bounds.width > 0, focusView.bounds.height > 0 else { return }

        let status = AVCaptureDevice.authorizationStatus(for: .video)
        guard status == .authorized else {
            emitError("PERMISSION_DENIED - Camera permission is required for MRZ scanning")
            return
        }

        #if canImport(UdentifyMRZ) && canImport(UdentifyCommons)
        let borderColor = UIColor(hex: focusViewBorderColor as String) ?? UIColor(red: 0.306, green: 0.796, blue: 0.651, alpha: 1)
        let strokeWidth = CGFloat(focusViewStrokeWidth.floatValue)

        mrzCameraController = MRZCameraController(
            on: previewContainer,
            mrzPreviewView: focusView,
            focusViewBorderColor: borderColor,
            focusViewStrokeWidth: strokeWidth,
            delegate: self
        )
        didStart = true
        needsRestart = false
        didSucceed = false

        // Give AVCaptureSession a brief window to initialize before resuming.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
            guard let self = self, self.didStart, !self.paused, !self.didSucceed else { return }
            self.mrzCameraController?.resumeMRZ()
        }
        #else
        emitError("SDK_NOT_AVAILABLE - UdentifyMRZ framework is not linked")
        #endif
    }

    private func restartIfActive() {
        guard didStart, needsRestart else { return }
        teardown()
        startIfReady()
    }

    private func applyPaused() {
        #if canImport(UdentifyMRZ) && canImport(UdentifyCommons)
        guard didStart else { return }
        if paused {
            mrzCameraController?.pauseMRZ()
        } else if !didSucceed {
            mrzCameraController?.resumeMRZ()
        }
        #endif
    }

    private func teardown() {
        #if canImport(UdentifyMRZ) && canImport(UdentifyCommons)
        mrzCameraController?.pauseMRZ()
        mrzCameraController = nil
        #endif
        didStart = false
    }

    private func emitError(_ message: String) {
        onMrzError?(["errorMessage": message])
    }
}

// MARK: - MRZCameraControllerDelegate

#if canImport(UdentifyMRZ) && canImport(UdentifyCommons)
extension MrzCameraView: MRZCameraControllerDelegate {

    public func onStart() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            guard let self = self, self.didStart, !self.paused, !self.didSucceed else { return }
            self.mrzCameraController?.resumeMRZ()
        }
    }

    public func onStop() {}
    public func onPause() {}
    public func onResume() {}

    public func onDestroy() {
        DispatchQueue.main.async { [weak self] in
            self?.teardown()
        }
    }

    public func onSuccess(documentNumber: String?, dateOfBirth: String?, dateOfExpiration: String?) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, !self.didSucceed else { return }
            self.didSucceed = true
            self.mrzCameraController?.pauseMRZ()
            self.onMrzDetected?([
                "documentNumber": documentNumber ?? "",
                "dateOfBirth": dateOfBirth ?? "",
                "dateOfExpiration": dateOfExpiration ?? ""
            ])
        }
    }

    public func onProgress(progress: Float) {
        // Progress updates are intentionally not forwarded to JS here —
        // the modal `startMrzCamera` path already handles that via its
        // own event emitter.
    }

    public func onFailure(error: Error) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let message: String
            if let cameraError = error as? CameraError {
                switch cameraError {
                case .CameraNotFound:
                    message = "CAMERA_NOT_FOUND - Couldn't find the camera"
                case .CameraPermissionRequired:
                    message = "CAMERA_PERMISSION_REQUIRED - Camera permission is required"
                case .FocusViewInvalidSize(let detail):
                    message = "FOCUS_VIEW_INVALID_SIZE - \(detail)"
                case .SessionPresetNotAvailable:
                    message = "SESSION_PRESET_NOT_AVAILABLE - Min. 720p rear camera is required"
                case .MinIOSRequirementNotSatisfied:
                    message = "MIN_IOS_REQUIREMENT_NOT_SATISFIED"
                case .Unknown:
                    message = "UNKNOWN_ERROR"
                default:
                    message = "UNKNOWN_CAMERA_ERROR"
                }
            } else {
                message = error.localizedDescription
            }
            self.emitError(message)
        }
    }
}
#endif
