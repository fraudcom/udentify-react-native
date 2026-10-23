import UIKit
import UdentifyFACE
import UdentifyNFC
import udentify_core

/// A banner in its own window, above whatever the SDK presents.
final class ExampleBanner {

    private var window: UIWindow?
    private let label = UILabel()

    func show(_ text: String) {
        DispatchQueue.main.async {
            if self.window == nil { self.makeWindow() }
            self.label.text = text
        }
    }

    func hide() {
        DispatchQueue.main.async {
            self.window?.isHidden = true
            self.window = nil
        }
    }

    private func makeWindow() {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        guard let scene = scenes.first(where: { $0.activationState == .foregroundActive }) ?? scenes.first
        else { return }

        label.textColor = .white
        label.font = .systemFont(ofSize: 16, weight: .semibold)
        label.textAlignment = .center
        label.numberOfLines = 0

        let controller = UIViewController()
        controller.view.backgroundColor = UIColor(red: 0.42, green: 0.11, blue: 0.60, alpha: 0.85)
        label.translatesAutoresizingMaskIntoConstraints = false
        controller.view.addSubview(label)
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: controller.view.leadingAnchor, constant: 16),
            label.trailingAnchor.constraint(equalTo: controller.view.trailingAnchor, constant: -16),
            label.bottomAnchor.constraint(equalTo: controller.view.bottomAnchor, constant: -12)
        ])

        let window = UIWindow(windowScene: scene)
        window.frame = CGRect(x: 0, y: 0, width: scene.coordinateSpace.bounds.width, height: 100)
        window.windowLevel = .alert + 1
        window.isUserInteractionEnabled = false
        window.rootViewController = controller
        window.isHidden = false
        self.window = window
    }
}

/// A compact card in its own window at the bottom, above the call, with a Close button.
/// Small on purpose: the call resumes behind it, and the customer should see that.
final class ExampleResultCard {

    private var window: UIWindow?
    private let stack = UIStackView()

    func show(title: String, lines: [String]) {
        DispatchQueue.main.async {
            if self.window == nil { self.makeWindow() }
            self.stack.arrangedSubviews.forEach { $0.removeFromSuperview() }
            self.stack.addArrangedSubview(self.label(title, size: 16))
            lines.forEach { self.stack.addArrangedSubview(self.label($0, size: 14)) }
            self.stack.addArrangedSubview(self.closeButton())
            self.resize()
        }
    }

    func hide() {
        DispatchQueue.main.async {
            self.window?.isHidden = true
            self.window = nil
        }
    }

    private func makeWindow() {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        guard let scene = scenes.first(where: { $0.activationState == .foregroundActive }) ?? scenes.first
        else { return }

        let controller = UIViewController()
        controller.view.backgroundColor = UIColor(red: 0.06, green: 0.12, blue: 0.19, alpha: 0.95)
        controller.view.layer.cornerRadius = 16
        stack.axis = .vertical
        stack.spacing = 8
        stack.translatesAutoresizingMaskIntoConstraints = false
        controller.view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: controller.view.leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: controller.view.trailingAnchor, constant: -16),
            stack.topAnchor.constraint(equalTo: controller.view.topAnchor, constant: 16)
        ])

        let window = UIWindow(windowScene: scene)
        window.backgroundColor = .clear
        window.windowLevel = .alert + 2
        window.rootViewController = controller
        window.isHidden = false
        self.window = window
    }

    /// Sizes the window to its content, at the bottom with a margin.
    private func resize() {
        guard let window, let scene = window.windowScene else { return }
        let bounds = scene.coordinateSpace.bounds
        let width = bounds.width - 32
        let fitting = stack.systemLayoutSizeFitting(
            CGSize(width: width - 32, height: UIView.layoutFittingCompressedSize.height),
            withHorizontalFittingPriority: .required, verticalFittingPriority: .fittingSizeLevel)
        let height = fitting.height + 32
        window.frame = CGRect(x: 16, y: bounds.height - height - 40, width: width, height: height)
    }

    private func label(_ text: String, size: CGFloat) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = .systemFont(ofSize: size, weight: .semibold)
        label.textColor = .white
        label.textAlignment = .center
        label.numberOfLines = 0
        return label
    }

    private func closeButton() -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(ExampleStrings.own("example_close"), for: .normal)
        button.backgroundColor = .white
        button.layer.cornerRadius = 8
        button.heightAnchor.constraint(equalToConstant: 40).isActive = true
        button.addAction(UIAction { [weak self] _ in self?.hide() }, for: .touchUpInside)
        return button
    }
}

/// Example Face listener: a banner with the current gesture, then a compact card from the
/// moment capture ends: "submitted", and the verdict when it arrives. Observes only; the
/// SDK owns the outcome, and the call resumes behind the card.
final class ExampleFaceOverlay: NSObject, ActiveCameraControllerDelegate {

    private let banner = ExampleBanner()
    private let page = ExampleResultCard()
    private var title: String { ExampleStrings.own("example_face_title") }

    func onActiveLivenessDirectiveChanged(directive: ActiveLivenessDirective) {
        banner.show(ExampleStrings.own("example_face_overlay", gesture(directive)))
    }

    func onActiveLivenessCapturingCompleted() {
        banner.hide()
        page.show(title: title, lines: [ExampleStrings.own("example_face_submitted")])
    }

    func onResult(result: FaceIDMessage) {
        banner.hide()
        var lines = [ExampleStrings.own(result.isFailed ? "example_face_failed" : "example_face_passed")]
        let gestures = result.activeLivenessResult?.gestureResult ?? [:]
        lines += gestures.sorted { $0.key < $1.key }.map {
            "\($0.key): \(ExampleStrings.own($0.value ? "example_gesture_ok" : "example_gesture_failed"))"
        }
        page.show(title: title, lines: lines)
    }

    private func gesture(_ directive: ActiveLivenessDirective) -> String {
        switch directive {
        case .turnHeadLeft: return ExampleStrings.own("example_gesture_turn_left")
        case .turnHeadRight: return ExampleStrings.own("example_gesture_turn_right")
        case .turnHeadUp: return ExampleStrings.own("example_gesture_turn_up")
        case .turnHeadDown: return ExampleStrings.own("example_gesture_turn_down")
        case .blink: return ExampleStrings.own("example_gesture_blink")
        case .smile: return ExampleStrings.own("example_gesture_smile")
        @unknown default: return "\(directive)"
        }
    }

    func onFailure(error: Error) {
        banner.hide()
        page.show(title: title, lines: [ExampleStrings.own("example_face_check_failed", error.localizedDescription)])
    }

    // A cancelled or dismissed capture leaves no verdict to come, so only the banner goes.
    func backButtonPressed() { banner.hide() }

    func didDismiss() { banner.hide() }
}

/// Example NFC listener. The system NFC sheet cannot be replaced, so this only adds a
/// banner while the reader session is open. Pass the same table as `liveKYCOptions.nfcTableName`
/// if the app sets one; nil reads the SDK's default table.
final class ExampleNFCOverlay: NSObject, NFCReaderSessionDelegate {

    private let banner = ExampleBanner()
    private let tableName: String?

    init(tableName: String? = nil) {
        self.tableName = tableName
    }

    func nfcReaderSessionDidBegin() {
        let reading = ExampleStrings.sdk("nfc_reading_progress_message",
            in: UdentifyLiveKYCModuleSettings.nfcLocalizationBundle?(), table: tableName, fallback: "Reading the chip")
        banner.show(ExampleStrings.own("example_nfc_status", reading))
    }

    func nfcReaderSessionDidEnd(with message: String?) {
        banner.hide()
    }
}
