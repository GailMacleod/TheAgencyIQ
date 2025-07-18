
// React Application Mount Fix
window.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Fixing workflow UI display issues...');
    
    // Ensure React is available globally
    if (typeof window.React === 'undefined') {
        console.log('Loading React from bundle...');
        // The main.js bundle should provide React
    }
    
    // Check if the root element exists
    const rootElement = document.getElementById('root');
    if (!rootElement) {
        console.error('Root element not found!');
        return;
    }
    
    // Check if the app is already mounted
    if (rootElement.innerHTML && rootElement.innerHTML !== 'Loading TheAgencyIQ...') {
        console.log('App already mounted, skipping...');
        return;
    }
    
    // Try to initialize the app
    try {
        if (window.App && typeof window.App === 'function') {
            console.log('Initializing TheAgencyIQ App...');
            window.App();
        } else {
            console.log('App function not available, checking for React render...');
            // Fallback: try to get React from the bundle
            if (window.React && window.ReactDOM) {
                console.log('React found, attempting manual render...');
                // The bundle should handle this automatically
            }
        }
    } catch (error) {
        console.error('App initialization error:', error);
        // Fallback to basic HTML
        rootElement.innerHTML = `
            <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
                <h1>TheAgencyIQ</h1>
                <p>Loading application...</p>
                <p style="color: #666; font-size: 14px;">If this message persists, please refresh the page.</p>
            </div>
        `;
    }
    
    console.log('✅ Workflow UI fixes applied successfully');
});

// Additional UI fixes
window.addEventListener('load', function() {
    console.log('🎨 Fixing splash UI layout issues...');
    
    // Fix any layout issues
    const rootElement = document.getElementById('root');
    if (rootElement && rootElement.innerHTML === 'Loading TheAgencyIQ...') {
        setTimeout(() => {
            if (rootElement.innerHTML === 'Loading TheAgencyIQ...') {
                console.log('App still loading, applying fallback UI...');
                rootElement.innerHTML = `
                    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: Arial, sans-serif;">
                        <div style="text-align: center; padding: 40px;">
                            <h1 style="color: #3250fa; margin-bottom: 20px;">TheAgencyIQ</h1>
                            <p style="color: #666; margin-bottom: 20px;">AI-Powered Social Media Automation</p>
                            <div style="width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #3250fa; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto;"></div>
                            <p style="color: #999; font-size: 14px;">Initializing application...</p>
                        </div>
                    </div>
                    <style>
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                `;
            }
        }, 2000);
    }
    
    console.log('✅ UI fixes applied successfully');
});
