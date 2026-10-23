//  LiveKYCModuleSettings.swift
//  udentify-core
//  Rendezvous for the module settings LiveKYC asks the host to install.

import Foundation

/// Carries the SDK's `LiveKYCSettings` closures across a package boundary.
/// Each module wrapper publishes its installer here and video-call - the only
/// package importing `UdentifyLiveKYC` - forwards them, so OCR-only installs do
/// not pull in `UdentifyVC`. A `nil` slot means that package is not installed.
public enum UdentifyLiveKYCModuleSettings {

    /// Sets `OCRSettingsProvider.currentSettings`. Published by
    /// `ocr-rn-library`, invoked from `LiveKYCSettings.ocr`.
    public static var installOCRSettings: (() -> Void)?

    /// Sets `ApiSettingsProvider.currentSettings`. Published by
    /// `liveness-rn-library`, invoked from `LiveKYCSettings.face`.
    public static var installFaceSettings: (() -> Void)?

    /// The NFC step has no settings object of its own; the slot exists because
    /// the SDK exposes the closure, and stays `nil` unless something needs it.
    public static var installNFCSettings: (() -> Void)?

    /// The bundle the in-call NFC screen reads its text from, published by
    /// `nfc-rn-library`. NFC takes its bundle as a field on `VCLiveKYCOptions`
    /// rather than through a settings provider, so this is read once when a call
    /// starts. A closure, not a value: the app's language may be chosen after
    /// this is published, and the bundle is narrowed on each read.
    public static var nfcLocalizationBundle: (() -> Bundle?)?
}
