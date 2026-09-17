//
//  VideoCallService.swift
//  UdentifyVC
//
//  Created by Doğuş Kaynak on 26.08.2026.
//

import Foundation
import UdentifyCommons

public class VideoCallService {
    private let baseURL: String

    /// Initializes the service with a base URL.
    /// - Parameters:
    ///   - baseURL: The base URL for your API.
    public init(baseURL: String) {
        self.baseURL = baseURL
    }

    /// Cancels an ongoing video call transaction on the server.
    /// - Parameters:
    ///   - transactionId: The transaction identifier of the video call to be cancelled.
    ///   - params: The parameters to be sent in the body (e.g. cancel reason code).
    ///   - completion: Completion handler returning either the `response` flag from the server or an `Error`.
    public func cancelVideoCall(transactionId: String,
                                 params: [String: String],
                                 completion: @escaping (Result<Bool, Error>) -> Void) {
        
        guard let url = URL(string: "\(baseURL)/videoCall/cancelVideoCall") else {
            completion(.failure(GeneralError.InvalidURL))
            return
        }

        let transactionReq = TransactionRequest(transactionId: transactionId, params: params)

        VCSettings.logger?.info(logMessage: "Generating server request for cancelling video call...", logPeriod: .onProcess)

        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        let data: Data
        do {
            data = try encoder.encode(transactionReq)
        } catch {
            VCSettings.logger?.error(logMessage: "Encoding error: \(error.localizedDescription)", logPeriod: .onProcess)
            completion(.failure(GeneralError.JsonEncodingError(error.localizedDescription)))
            return
        }

        guard let payload = String(data: data, encoding: .utf8) else {
            let error = ServerError.InvalidResponse("Failed to convert data to String.")
            VCSettings.logger?.error(logMessage: error.localizedDescription, logPeriod: .onProcess)
            completion(.failure(GeneralError.JsonEncodingError(error.localizedDescription)))
            return
        }

        VCSettings.logger?.info(logMessage: "Posting data to server for cancelling video call...", logPeriod: .onProcess)

        WebService.shared.postAsync(payload: payload, serverURL: url.absoluteString) {
            (data, response, error) in

            VCSettings.logger?.info(logMessage: "Cancel Video Call response received from server.", logPeriod: .onProcess)

            if let error = error {
                VCSettings.logger?.error(logMessage: "Error on Cancel Video Call response : \(error.localizedDescription)", logPeriod: .onProcess)
                VCSettings.logger?.postLogs(serverURL: self.baseURL, error: error, webService: WebService.shared)
                DispatchQueue.main.async {
                    completion(.failure(error))
                }
                return
            }

            guard let data = data,
                  let httpResponse = response as? HTTPURLResponse else {
                let serverError = ServerError.InvalidResponse(ErrMessage.ERR_SERVER_RESPONSE_NIL.rawValue)
                VCSettings.logger?.error(logMessage: "Invalid server response on cancelling video call.", logPeriod: .onProcess)
                VCSettings.logger?.postLogs(serverURL: self.baseURL, error: serverError, webService: WebService.shared)
                DispatchQueue.main.async {
                    completion(.failure(serverError))
                }
                return
            }

            VCSettings.logger?.verbose(logMessage: "HTTP Status: \(httpResponse.statusCode)", logPeriod: .onProcess)

            guard let cancelResponse = try? JSONDecoder().decode(CancelVideoCallResponse.self, from: data) else {
                let serverError = VCError.api(ErrMessage.ERR_SERVER_RESPONSE_NIL.rawValue)
                VCSettings.logger?.error(logMessage: "Cancel Video Call server response is nil / couldn't be decoded.", logPeriod: .onProcess)
                VCSettings.logger?.postLogs(serverURL: self.baseURL, error: serverError, webService: WebService.shared)
                DispatchQueue.main.async {
                    completion(.failure(serverError))
                }
                return
            }

            VCSettings.logger?.verbose(logMessage: "Cancel Video Call response is \(cancelResponse)", logPeriod: .onProcess)

            guard cancelResponse.status == "OK" else {
                let error = VCError.api(cancelResponse.message)
                VCSettings.logger?.error(logMessage: "Failed to cancel video call: \(cancelResponse.message)", logPeriod: .onProcess)
                VCSettings.logger?.postLogs(serverURL: self.baseURL, error: error, webService: WebService.shared)
                DispatchQueue.main.async {
                    completion(.failure(error))
                }
                return
            }

            VCSettings.logger?.info(logMessage: "Video call cancelled successfully.", logPeriod: .onProcess)
            VCSettings.logger?.postLogs(serverURL: self.baseURL, error: nil, webService: WebService.shared)

            DispatchQueue.main.async {
                completion(.success(cancelResponse.response))
            }
        }
    }
}
