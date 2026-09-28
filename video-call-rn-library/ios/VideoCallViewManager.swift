//  VideoCallViewManager.swift
//  video-call-rn-library
//  RCTViewManager that hosts the SDK's VCCameraController inside <VideoCallView/>.

import Foundation
import UIKit
import React
import UdentifyVC
import UdentifyLiveKYC
import UdentifyCommons
import udentify_core

/// Keeps the screen awake while a call is on screen, via a reference-counted
/// `UIApplication.isIdleTimerDisabled` - the idle timer is process-wide, so one
/// holder letting go must not cancel another's. Balance `acquire()` with
/// `release()`; the call-is-over paths use `releaseAll()`.
enum VideoCallScreenLock {

    // Mutated on the main thread only (see `onMain`), so it needs no
    // further synchronization.
    private static var holders = 0

    /// Disables the idle timer. Every `acquire()` must be balanced by a
    /// `release()`, or subsumed by a `releaseAll()`.
    static func acquire() {
        onMain {
            holders += 1
            apply()
        }
    }

    /// Gives back a single hold taken by `acquire()`.
    static func release() {
        onMain {
            holders = max(0, holders - 1)
            apply()
        }
    }

    /// Drops every outstanding hold. Used by the call-is-over paths, which
    /// mean the screen may sleep again no matter how many holds are open.
    static func releaseAll() {
        onMain {
            holders = 0
            apply()
        }
    }

    /// Whether the idle timer is currently being held disabled. Main thread
    /// only; exposed for debugging a screen that dims when it should not.
    static var isHeld: Bool { holders > 0 }

    private static func apply() {
        let shouldDisable = holders > 0
        guard UIApplication.shared.isIdleTimerDisabled != shouldDisable else { return }
        UIApplication.shared.isIdleTimerDisabled = shouldDisable
        print("VideoCallScreenLock - idle timer \(shouldDisable ? "disabled (screen stays on)" : "re-enabled")")
    }

    // isIdleTimerDisabled is UIKit state and must only be touched on the
    // main thread. The delegate callbacks that release the lock are already
    // main-queue, but deinit is not guaranteed to be.
    private static func onMain(_ work: @escaping () -> Void) {
        if Thread.isMainThread {
            work()
        } else {
            DispatchQueue.main.async(execute: work)
        }
    }
}

/// The React view behind `<VideoCallView/>`.
///
/// The SDK's call host is a `UIViewController`, so it is hosted here by child
/// view controller containment rather than presented modally - the view must
/// stay inline for React-level overlays, such as the end-call button, to draw
/// above the call.
@objc(RNVideoCallHostView)
public final class RNVideoCallHostView: UIView {

    /// The mounted host, if any. Replaces the `hasActiveInstance` /
    /// `activeServerURL` / `activeTransactionID` / `currentUserStatus` /
    /// `endActiveCall` statics that the pre-0923 SDK view exposed; the
    /// controller is an instance now, so the host that owns it answers for it.
    public private(set) static weak var active: RNVideoCallHostView?

    @objc public var credentials: NSDictionary? {
        didSet { startIfReady() }
    }

    @objc public var config: NSDictionary? {
        didSet { startIfReady() }
    }

    /// The SDK's `VCLiveKYCOptions` as a dictionary from JS: one object, fixed
    /// for the session, read once when the call starts. Its presence is the
    /// switch - nil runs a plain call. iOS only; Android configures its modules
    /// through each package's `setRepeatConfig`.
    @objc public var liveKYCOptions: NSDictionary? {
        didSet { startIfReady() }
    }

    private var controller: VCCameraController?
    private var operatorBridge: VideoCallOperatorImpl?

    /// Set once the controller has been created. `isFinished` is never cleared,
    /// so an ended call does not restart itself when the view re-attaches or a
    /// `config` update arrives.
    private var hasStarted = false
    private var isFinished = false
    private var isHoldingScreenLock = false

    public private(set) var activeServerURL: String?
    public private(set) var activeTransactionID: String?

    public var currentStatus: String { operatorBridge?.getStatus() ?? "idle" }

    // MARK: - Lifecycle

    public override func didMoveToWindow() {
        super.didMoveToWindow()

        if window != nil {
            if !isHoldingScreenLock {
                isHoldingScreenLock = true
                VideoCallScreenLock.acquire()
            }
            startIfReady()
        } else {
            releaseScreenLockIfNeeded()
        }
    }

    public override func layoutSubviews() {
        super.layoutSubviews()
        controller?.view.frame = bounds
    }

    deinit {
        releaseScreenLockIfNeeded()
    }

    /// React unmount. `RCTViewManager` views are released when JS unmounts them,
    /// so this is the iOS counterpart of Android's `onDropViewInstance`.
    public override func removeFromSuperview() {
        super.removeFromSuperview()
        if window == nil { teardown() }
    }

    // MARK: - Start

    private func startIfReady() {
        guard !hasStarted, !isFinished, window != nil,
              let creds = credentials,
              let serverURL = creds["serverURL"] as? String, !serverURL.isEmpty,
              let wsURL = creds["wssURL"] as? String, !wsURL.isEmpty,
              let transactionID = creds["transactionID"] as? String, !transactionID.isEmpty,
              let username = creds["clientName"] as? String, !username.isEmpty,
              let host = reactViewController()
        else { return }

        hasStarted = true
        activeServerURL = serverURL
        activeTransactionID = transactionID

        var idleTimeout = 100
        if let value = creds["idleTimeout"] {
            if let intValue = value as? Int {
                idleTimeout = intValue
            } else if let stringValue = value as? String, let intValue = Int(stringValue) {
                idleTimeout = intValue
            }
        }

        // Frames per second. Stays nil unless the app asked, so the SDK's own
        // default applies. The SDK clamps a rate the sensor cannot do.
        var cameraFeedFrameRate: Int?
        if let value = creds["cameraFeedFrameRate"] as? NSNumber {
            let rounded = value.intValue
            if rounded > 0 {
                cameraFeedFrameRate = rounded
            } else {
                print("RNVideoCallHostView - cameraFeedFrameRate=\(value) ignored: "
                      + "expected a positive number of frames per second")
            }
        }

        // Narrowed to the app's selected language at the moment the call starts,
        // by which time instantiateServerBasedLocalization has recorded it. The
        // same helper serves the OCR, NFC and face bundles, so one language
        // control covers every SDK; with no language set it returns the bundle
        // unchanged and iOS picks by device language as before.
        let bundle = UdentifyLanguagePreference.localizedBundle(
            for: VideoCallBundleHelper.localizationBundle ?? .main)
        // The host view's width is what a signed `center` offset is measured
        // against; see CustomVideoCallSettings.horizontalPosition.
        let settings = CustomVideoCallSettings(
            localizationBundle: bundle,
            uiConfig: config as? [String: Any],
            containerWidth: bounds.width
        ).createVCSettings()

        // The SDK resolves its own strings through these two statics, and
        // `tableName` belongs to a specific <VideoCallView>'s config rather than
        // to the module, so it is assigned per call here. VideoCallManager
        // clears it at init for exactly that reason. Until 26.3.0917 the
        // UdentifyVC source in this repo did this inside the SDK; the binary
        // does not, so dropping it silently ignored `config.tableName`.
        LocalizationConfiguration.tableName = settings.tableName
        LocalizationConfiguration.bundle = settings.bundle

        let bridge = VideoCallOperatorImpl(
            serverURL: serverURL,
            wssURL: wsURL,
            userID: (creds["userID"] as? String) ?? "",
            transactionID: transactionID,
            clientName: username,
            idleTimeout: String(idleTimeout),
            eventEmitter: VideoCallManager.sharedEventEmitter
        )
        operatorBridge = bridge

        // Weak: the static closure would otherwise keep this call's bridge - and
        // the RCTEventEmitter it holds - alive for the whole process. Cleared in
        // teardown() alongside the bridge itself.
        VCCameraController.onMicrophoneStateChanged = { [weak bridge] enabled in
            bridge?.onMicrophoneStateChanged(enabled)
        }

        Self.installLiveKYCModuleSettings()

        // LiveKYC is toggled exactly the way the SDK toggles it: nil disables it
        // and the call runs plain, a non-nil VCLiveKYCOptions enables it. The
        // wrapper adds no gate of its own - `observationMode` on the credentials
        // is the app asking for LiveKYC, and its absence is the app not asking.
        let liveKYCOptions = Self.buildLiveKYCOptions(from: liveKYCOptions,
                                                      credentials: creds,
                                                      bridge: bridge)

        // videoCaptureMode is deliberately not passed: the SDK owns the switch
        // to .cameraFeedBuffer when LiveKYC runs in .cameraFeed, and the
        // .liveKitCamera default is already correct for a plain call.
        // Two call sites rather than a `?? 15`: cameraFeedFrameRate defaults in the
        // SDK's own initialiser, and copying that number here would pin it.
        let controller: VCCameraController
        if let cameraFeedFrameRate = cameraFeedFrameRate {
            controller = VCCameraController(
                delegate: bridge,
                serverURL: serverURL,
                wsURL: wsURL,
                transactionID: transactionID,
                username: username,
                idleTimeout: idleTimeout,
                settings: settings,
                cameraFeedFrameRate: cameraFeedFrameRate,
                liveKYCOptions: liveKYCOptions
            )
        } else {
            controller = VCCameraController(
                delegate: bridge,
                serverURL: serverURL,
                wsURL: wsURL,
                transactionID: transactionID,
                username: username,
                idleTimeout: idleTimeout,
                settings: settings,
                liveKYCOptions: liveKYCOptions
            )
        }
        self.controller = controller
        RNVideoCallHostView.active = self

        host.addChild(controller)
        controller.view.frame = bounds
        controller.view.autoresizingMask = [UIView.AutoresizingMask.flexibleWidth, .flexibleHeight]
        addSubview(controller.view)
        controller.didMove(toParent: host)
    }

    // MARK: - LiveKYC module settings

    /// Assigns `LiveKYCSettings.ocr` / `.face` / `.nfc`, so the in-call module
    /// screens get their own SDK's settings provider. The bodies live in the
    /// module wrappers and arrive through udentify-core, so this package links
    /// neither UdentifyOCR nor UdentifyFACE. An unfilled slot stays nil.
    /// Assigned as the call starts rather than at launch: no module screen can
    /// exist before the controller does.
    private static func installLiveKYCModuleSettings() {
        LiveKYCSettings.ocr = {
            UdentifyLiveKYCModuleSettings.installOCRSettings?()
        }
        LiveKYCSettings.face = {
            UdentifyLiveKYCModuleSettings.installFaceSettings?()
        }
        LiveKYCSettings.nfc = { UdentifyLiveKYCModuleSettings.installNFCSettings?() }
    }

    // MARK: - LiveKYC options

    /// Builds `VCLiveKYCOptions` from the `liveKYCOptions` prop, falling back to
    /// the legacy `credentials.observationMode` so existing integrations keep
    /// working; `liveKYCOptions` wins when both are given. `nil` means no LiveKYC,
    /// and omitted fields keep the SDK's defaults.
    private static func buildLiveKYCOptions(from options: NSDictionary?,
                                            credentials creds: NSDictionary,
                                            bridge: VideoCallOperatorImpl) -> VCLiveKYCOptions? {
        let legacyMode = (creds["observationMode"] as? String).flatMap(observationMode)
        guard let options = options else {
            // Legacy path: observationMode on the credentials, nothing else.
            guard let mode = legacyMode else { return nil }
            return VCLiveKYCOptions(userID: creds["userID"] as? String,
                                    observationMode: mode,
                                    onEvent: { [weak bridge] in bridge?.handleLiveKYCEvent($0) })
        }

        let defaults = VCLiveKYCOptions()
        let mode = (options["observationMode"] as? String).flatMap(observationMode)
            ?? legacyMode ?? defaults.observationMode

        return VCLiveKYCOptions(
            ocrDocumentType: enumValue(options["ocrDocumentType"], defaults.ocrDocumentType),
            ocrCountry: country(options["ocrCountry"]) ?? defaults.ocrCountry,
            ocrDocumentSide: enumValue(options["ocrDocumentSide"], defaults.ocrDocumentSide),
            ocrManualCapture: options["ocrManualCapture"] as? Bool ?? defaults.ocrManualCapture,
            ocrDocumentLivenessEnabled: options["ocrDocumentLivenessEnabled"] as? Bool
                ?? defaults.ocrDocumentLivenessEnabled,
            hologramNoFlashDuration: options["hologramNoFlashDuration"] as? Double
                ?? defaults.hologramNoFlashDuration,
            hologramFlashDuration: options["hologramFlashDuration"] as? Double
                ?? defaults.hologramFlashDuration,
            hologramTotalDuration: options["hologramTotalDuration"] as? Double
                ?? defaults.hologramTotalDuration,
            hologramBitrate: options["hologramBitrate"] as? Double ?? defaults.hologramBitrate,
            hologramRequestTimeout: options["hologramRequestTimeout"] as? Double
                ?? defaults.hologramRequestTimeout,
            faceMethod: enumValue(options["faceMethod"], defaults.faceMethod),
            selfieOperation: enumValue(options["selfieOperation"], defaults.selfieOperation),
            faceLivenessMode: enumValue(options["faceLivenessMode"], defaults.faceLivenessMode),
            userID: options["userID"] as? String ?? creds["userID"] as? String ?? defaults.userID,
            listName: options["listName"] as? String ?? defaults.listName,
            nfcChipAnticloneMode: enumValue(options["nfcChipAnticloneMode"],
                                            defaults.nfcChipAnticloneMode),
            nfcIsPassiveAuthenticationEnabled: options["nfcIsPassiveAuthenticationEnabled"] as? Bool
                ?? defaults.nfcIsPassiveAuthenticationEnabled,
            nfcRequestTimeout: options["nfcRequestTimeout"] as? Double ?? defaults.nfcRequestTimeout,
            nfcIsFastModeEnabled: options["nfcIsFastModeEnabled"] as? Bool
                ?? defaults.nfcIsFastModeEnabled,
            // nfc-rn-library's bundle, narrowed to the selected language. NFC takes
            // its bundle here rather than through a settings provider, so without
            // this the in-call NFC screen reads from .main and finds none of our
            // strings. Falls back to the SDK's own default when NFC is not installed.
            nfcBundle: UdentifyLiveKYCModuleSettings.nfcLocalizationBundle?() ?? defaults.nfcBundle,
            nfcTableName: options["nfcTableName"] as? String ?? defaults.nfcTableName,
            observationMode: mode,
            onEvent: { [weak bridge] in bridge?.handleLiveKYCEvent($0) }
        )
    }

    /// A `String`-backed SDK enum from the value JS sent.
    ///
    /// No name translation: the TypeScript enums carry the SDK's own raw values
    /// (`'bothSides'`, `'ID_CARD'`, `'requireCA'`), so a lookup is exact. That
    /// is deliberate - guessing at a mapping between two spellings is how a
    /// silently wrong value gets passed to a capture flow. An unrecognised
    /// value keeps the SDK's default rather than failing the call.
    private static func enumValue<T: RawRepresentable>(_ raw: Any?, _ fallback: T) -> T
        where T.RawValue == String {
        guard let name = raw as? String else { return fallback }
        guard let match = T(rawValue: name) else {
            print("RNVideoCallHostView - unknown LiveKYC value '\(name)'; keeping the SDK default")
            return fallback
        }
        return match
    }

    /// An ISO country for the OCR step. Accepts the SDK's own codes.
    private static func country(_ raw: Any?) -> Country? {
        guard let code = raw as? String else { return nil }
        if let exact = Country(rawValue: code.uppercased()) { return exact }
        print("RNVideoCallHostView - unknown ocrCountry '\(code)'; keeping the SDK default")
        return nil
    }

    /// The JS `VideoCallObservationMode` names, which are screaming snake case,
    /// onto the SDK's own cases. `nil` for anything unrecognised, which leaves
    /// LiveKYC off rather than guessing a mode.
    private static func observationMode(_ raw: String) -> VCLiveKYCObservationMode? {
        switch raw.uppercased() {
        case "CAMERA_FEED":   return .cameraFeed
        case "SCREEN_SHARE":  return .screenShare
        case "PROGRESS_ONLY": return .progressOnly
        default:
            print("RNVideoCallHostView - unknown observationMode '\(raw)'; LiveKYC stays off")
            return nil
        }
    }

    // MARK: - Teardown

    /// Ends the call and unwinds containment. Safe to call more than once.
    public func teardown() {
        guard !isFinished else { return }
        isFinished = true

        if let controller = controller {
            controller.dismissController()
            controller.willMove(toParent: nil)
            controller.view.removeFromSuperview()
            controller.removeFromParent()
        }
        controller = nil

        VCCameraController.onMicrophoneStateChanged = nil
        LiveKYCSettings.ocr = nil
        LiveKYCSettings.face = nil
        LiveKYCSettings.nfc = nil
        operatorBridge = nil

        if RNVideoCallHostView.active === self {
            RNVideoCallHostView.active = nil
        }

        releaseScreenLockIfNeeded()
    }

    private func releaseScreenLockIfNeeded() {
        guard isHoldingScreenLock else { return }
        isHoldingScreenLock = false
        VideoCallScreenLock.release()
    }
}

@objc(VideoCallViewManager)
class VideoCallViewManager: RCTViewManager {

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func view() -> UIView! {
        return RNVideoCallHostView()
    }
}
