//
//  ErrMessage.swift
//  UdentifyVC
//
//  Created by Sercan Çobanoğlu on 14.02.2025.
//

import Foundation

enum ErrMessage: String {
    case ERR_TRANSACTION_RESPONSE_NIL
    case ERR_SERVER_RESPONSE_NIL
    case ERR_SERVER_URL_MISSING
    case ERR_TRANSACTION_ID_MISSING
    case ERR_TRANSACTION_RESPONSE_PARAMS_NIL
    case ERR_FAILED_TO_GET_ACCESS_TOKEN
    case ERR_UNKNOWN // Check server logs for details
}
