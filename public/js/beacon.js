// Beacon script for Replit compatibility
console.log("TheAgencyIQ beacon script loaded successfully");

// Simple beacon functionality
window.theagencyiq = window.theagencyiq || {};
window.theagencyiq.beacon = {
  init: function() {
    console.log("TheAgencyIQ beacon initialized");
  },
  track: function(event, data) {
    console.log("Beacon tracking:", event, data);
  }
};

// Initialize beacon
window.theagencyiq.beacon.init();