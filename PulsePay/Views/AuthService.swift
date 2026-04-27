import Foundation

enum AuthServiceError: LocalizedError {
    case httpStatus(Int)
    case serverMessage(String)
    case decoding(String)
    case unknown

    var errorDescription: String? {
        switch self {
        case .httpStatus(let code):
            return "Server returned status \(code)"
        case .serverMessage(let msg):
            return msg
        case .decoding(let msg):
            return "Decoding error: \(msg)"
        case .unknown:
            return "Unknown error"
        }
    }
}

struct AuthService {

    static let shared = AuthService()

    // ✅ Your Mac LAN IP + backend port
    var baseURL: URL {
        URL(string: "http://192.168.29.186:5001/api")!
    }

    private let decoder = JSONDecoder()

    // MARK: - LOGIN
    func login(email: String, password: String) async throws -> User {
        let endpoint = baseURL.appendingPathComponent("users/login")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["email": email, "password": password]
        request.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw AuthServiceError.unknown
        }

        print("🟢 LOGIN STATUS:", http.statusCode)
        print("🟢 RAW LOGIN RESPONSE:", String(data: data, encoding: .utf8) ?? "nil")

        if (200..<300).contains(http.statusCode) {
            do {
                let decoded = try decoder.decode(APIResponse<User>.self, from: data)

                // ✅ Support both: "data" OR "user"
                if let user = decoded.data ?? decoded.data {
                    return user
                } else {
                    throw AuthServiceError.serverMessage(decoded.message ?? "Login failed")
                }
            } catch {
                throw AuthServiceError.decoding(error.localizedDescription)
            }
        } else {
            throw AuthServiceError.httpStatus(http.statusCode)
        }
    }

    // MARK: - SIGN UP
    func signUp(fullName: String, email: String, phone: String, password: String) async throws -> User {
        let endpoint = baseURL.appendingPathComponent("users")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "fullName": fullName,
            "email": email,
            "phone": phone,
            "password": password
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw AuthServiceError.unknown
        }

        print("🟢 SIGNUP STATUS:", http.statusCode)
        print("🟢 RAW SIGNUP RESPONSE:", String(data: data, encoding: .utf8) ?? "nil")

        if (200..<300).contains(http.statusCode) {
            do {
                let decoded = try decoder.decode(APIResponse<User>.self, from: data)

                // ✅ Support both: "data" OR "user"
                if let user = decoded.data ?? decoded.data {
                    return user
                } else {
                    throw AuthServiceError.serverMessage(decoded.message ?? "Signup failed")
                }
            } catch {
                throw AuthServiceError.decoding(error.localizedDescription)
            }
        } else {
            throw AuthServiceError.httpStatus(http.statusCode)
        }
    }
}
