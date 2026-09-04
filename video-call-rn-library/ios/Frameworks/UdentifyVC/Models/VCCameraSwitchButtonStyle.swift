//
//  VCCameraSwitchButtonStyle.swift
//  UdentifyVC
//
//  Created by Sercan Çobanoğlu on 17.07.2025.
//

import UIKit
import UdentifyCommons

public struct VCCameraSwitchButtonStyle {
    
    public var color: UIColor
    public var size: CGFloat
    public var horizontalPosition: UdentifyHorizontalPosition
    public var verticalPosition: UdentifyVerticalPosition

    public init(
        color: UIColor = .white,
        size: CGFloat = 50,
        horizontalPosition: UdentifyHorizontalPosition = .left(offset: 16),
        verticalPosition: UdentifyVerticalPosition = .bottom(offset: 20)
    ) {
        self.color = color
        self.size = size
        self.horizontalPosition = horizontalPosition
        self.verticalPosition = verticalPosition
    }
}
