
// Session Management Fallback
window.sessionManager = {
    establishSession: function() {
        console.log('Session establishment failed, continuing with guest access');
        return Promise.resolve({ user: null, guest: true });
    },
    
    getSession: function() {
        console.log('Session establishment failed, continuing without auth');
        return Promise.resolve(null);
    }
};

// API Client fallback
window.apiClient = {
    get: function(url) {
        return fetch(url, { credentials: 'include' })
            .then(response => response.json())
            .catch(error => {
                console.error('API request failed:', error);
                return { error: true };
            });
    }
};
