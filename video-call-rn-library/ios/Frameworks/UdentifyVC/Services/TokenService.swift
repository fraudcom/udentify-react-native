//
//  TokenService.swift
//  UdentifyVC
//
//  Created by Sercan Çobanoğlu on 14.02.2025.
//
import Foundation
import UdentifyCommons

public class TokenService {
    private let baseURL: String
    
    /// Initializes the service with a base URL and an optional URLSession.
    /// - Parameters:
    ///   - baseURL: The base URL for your API.
    public init(baseURL: String) {
        self.baseURL = baseURL
    }
    
    /// Fetches the access token using a POST request.
    /// - Parameters:
    ///   - transactionId: The transaction identifier.
    ///   - params: The parameters to be sent in the body.
    ///   - completion: Completion handler returning either the token or a `NetworkError`.
    public func getAccessToken(transactionId: String,
                                 params: [String: String],
                                 completion: @escaping (Result<String, Error>) -> Void) {
        
        // Construct the full URL.
        guard let url = URL(string: "\(baseURL)/videoCall/getAccessToken") else {
            completion(.failure(GeneralError.InvalidURL))
            return
        }
        
        let transactionReq = TransactionRequest(transactionId: transactionId, params: params)
        
        VCSettings.logger?.info(logMessage: "Generating server request for fetching access token...", logPeriod: .onProcess)
        
        // Use do-catch to handle potential encoding errors.
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

        VCSettings.logger?.info(logMessage: "Posting data to server for fetching Access Token...", logPeriod: .onProcess)

        WebService.shared.postAsync(payload: payload, serverURL: url.absoluteString){
            (data, response, error) in
            
            VCSettings.logger?.info(logMessage: "Access Token Response received from server.", logPeriod: .onProcess)
            
            if let error = error {
                VCSettings.logger?.error(logMessage: "Error on Access Token response : \(error.localizedDescription)", logPeriod: .onProcess)
                VCSettings.logger?.postLogs(serverURL: self.baseURL, error: error, webService: WebService.shared)
                DispatchQueue.main.async {
                    completion(.failure(error))
                }
                return
            }
            
            guard let data = data,
                  let httpResponse = response as? HTTPURLResponse else {
                let serverError = ServerError.InvalidResponse(ErrMessage.ERR_SERVER_RESPONSE_NIL.rawValue)
                VCSettings.logger?.error(logMessage: "Invalid server response on getting Access Token.", logPeriod: .onProcess)
                VCSettings.logger?.postLogs(serverURL: self.baseURL, error: serverError, webService: WebService.shared)
                DispatchQueue.main.async {
                    completion(.failure(serverError))
                }
                return
            }
            
            VCSettings.logger?.verbose(logMessage: "HTTP Status: \(httpResponse.statusCode)", logPeriod: .onProcess)
            
            guard let serverResponse = try? JSONDecoder().decode(ServerResponse.self, from: data) else {
                let serverError = VCError.api(ErrMessage.ERR_SERVER_RESPONSE_NIL.rawValue)
                VCSettings.logger?.error(logMessage: "Server Response is nil.", logPeriod: .onProcess)
                VCSettings.logger?.postLogs(serverURL: self.baseURL, error: serverError, webService: WebService.shared)
                DispatchQueue.main.async {
                    completion(.failure(serverError))
                }
                return
            }
            
            guard let transactionResp = serverResponse.response else {
                let error = VCError.api(serverResponse.message)
                VCSettings.logger?.error(logMessage: "Transaction Response is nil.", logPeriod: .onProcess)
                VCSettings.logger?.postLogs(serverURL: self.baseURL, error: error, webService: WebService.shared)
                DispatchQueue.main.async {
                    completion(.failure(error))
                }
                return
            }
            
            VCSettings.logger?.verbose(logMessage: "Access Token response is \(transactionResp)", logPeriod: .onProcess)
            
            guard let params: [Int: String?] = transactionResp.data,
                  let optionalToken = params[164],
                  let token = optionalToken else {
                let errorMsg = ErrMessage.ERR_FAILED_TO_GET_ACCESS_TOKEN.rawValue
                let error = VCError.api(errorMsg)
                VCSettings.logger?.error(logMessage: errorMsg, logPeriod: .onProcess)
                VCSettings.logger?.postLogs(serverURL: self.baseURL, error: error, webService: WebService.shared)
                DispatchQueue.main.async {
                    completion(.failure(error))
                }
                return
            }
            
            // Return the token on the main thread.
            DispatchQueue.main.async {
                completion(.success(token))
            }
        }
        
    }
}
