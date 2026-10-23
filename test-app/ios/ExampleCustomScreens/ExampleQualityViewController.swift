import UIKit

/// Example screen for the own OCR flow. It stays up over the call for the whole step,
/// so the call never shows between captures: the SDK camera is presented over it, and
/// it switches between a status line and a quality result with Use / Retake / Cancel.
final class ExampleQualityViewController: UIViewController {

    private let stack = UIStackView()
    private let titleText: String

    init(title: String) {
        titleText = title
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .overFullScreen
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.06, green: 0.12, blue: 0.19, alpha: 1)
        stack.axis = .vertical
        stack.spacing = 12
        stack.alignment = .fill
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }

    /// A message with no buttons, for the moments between captures.
    func showStatus(_ text: String) {
        reset(lines: [text])
    }

    func showResult(lines: [String], canUse: Bool, titles: (use: String, retake: String, cancel: String),
                    onUse: @escaping () -> Void, onRetake: @escaping () -> Void,
                    onCancel: @escaping () -> Void) {
        reset(lines: lines)
        if canUse { stack.addArrangedSubview(button(titles.use, onUse)) }
        stack.addArrangedSubview(button(titles.retake, onRetake))
        stack.addArrangedSubview(button(titles.cancel, onCancel))
    }

    private func reset(lines: [String]) {
        loadViewIfNeeded()
        stack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        stack.addArrangedSubview(label(titleText, size: 18))
        lines.forEach { stack.addArrangedSubview(label($0, size: 16)) }
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

    private func button(_ title: String, _ action: @escaping () -> Void) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.backgroundColor = .white
        button.layer.cornerRadius = 8
        button.heightAnchor.constraint(equalToConstant: 44).isActive = true
        button.addAction(UIAction { _ in action() }, for: .touchUpInside)
        return button
    }
}
