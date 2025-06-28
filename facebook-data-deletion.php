<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Handle GET request (Facebook validation)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    http_response_code(200);
    echo json_encode(['status' => 'ok']);
    exit();
}

// Handle POST request (actual deletion)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    
    // Parse form data
    parse_str($input, $data);
    
    $signed_request = isset($data['signed_request']) ? $data['signed_request'] : null;
    
    if ($signed_request) {
        // Parse signed request
        $parts = explode('.', $signed_request);
        if (count($parts) === 2) {
            $payload = base64_decode(strtr($parts[1], '-_', '+/'));
            $decoded = json_decode($payload, true);
            $user_id = isset($decoded['user_id']) ? $decoded['user_id'] : 'unknown_user';
        } else {
            $user_id = 'invalid_request';
        }
    } else {
        $user_id = 'test_user_' . time();
    }
    
    $confirmation_code = 'del_' . time() . '_' . $user_id;
    $status_url = 'https://app.theagencyiq.ai/deletion-status/' . $user_id;
    
    http_response_code(200);
    echo json_encode([
        'url' => $status_url,
        'confirmation_code' => $confirmation_code
    ]);
    exit();
}

// Default response
http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
?>