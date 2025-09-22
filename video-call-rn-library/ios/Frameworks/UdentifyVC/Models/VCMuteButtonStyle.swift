//
//  UdentifyMuteButtonStyle.swift
//  UdentifyVC
//
//  Created by Sercan Çobanoğlu on 12.02.2025.
//
import UIKit
import UdentifyCommons

public struct VCMuteButtonStyle {
    
    public var mutedColor: UIColor
    public var unmutedColor: UIColor
    public var size: CGFloat
    public var horizontalPosition: UdentifyHorizontalPosition
    public var verticalPosition: UdentifyVerticalPosition

    public init(
        mutedColor: UIColor = .red,
        unmutedColor: UIColor = .white,
        size: CGFloat = 50,
        horizontalPosition: UdentifyHorizontalPosition = .center,
        verticalPosition: UdentifyVerticalPosition = .bottom(offset: 20)
    ) {
        self.mutedColor = mutedColor
        self.unmutedColor = unmutedColor
        self.size = size
        self.horizontalPosition = horizontalPosition
        self.verticalPosition = verticalPosition
    }
}
