
// Server-side React initialization fix
const express = require('express');
const path = require('path');
const fs = require('fs');

// Enhanced server with proper React serving
function createReactServer() {
    const app = express();
    
    // Serve static files
    app.use(express.static(path.join(__dirname, 'dist_backup_20250712_110901')));
    
    // Handle React routing
    app.get('*', (req, res) => {
        const indexPath = path.join(__dirname, 'dist_backup_20250712_110901', 'index.html');
        res.sendFile(indexPath);
    });
    
    return app;
}

module.exports = createReactServer;
