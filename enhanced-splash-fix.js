// Enhanced splash page UI fix script
// This script addresses the UI issues visible in the screenshot

function fixSplashUI() {
  console.log('🎨 Fixing splash UI layout issues...');
  
  // Fix responsive issues
  const style = document.createElement('style');
  style.textContent = `
    /* Enhanced responsive fixes */
    @media (max-width: 768px) {
      .container-atomiq {
        padding-left: 1rem !important;
        padding-right: 1rem !important;
        max-width: 100% !important;
      }
      
      .platform-logos {
        flex-wrap: wrap !important;
        justify-content: center !important;
        gap: 1rem !important;
      }
      
      .platform-logos svg {
        width: 2rem !important;
        height: 2rem !important;
      }
      
      .onboarding-wizard {
        max-width: 95% !important;
        margin: 0 auto !important;
      }
      
      .hero-section h1 {
        font-size: 2.5rem !important;
        line-height: 1.2 !important;
      }
      
      .hero-section h2 {
        font-size: 2rem !important;
        line-height: 1.3 !important;
      }
      
      .features-grid {
        grid-template-columns: 1fr !important;
        gap: 1.5rem !important;
      }
      
      .pricing-section {
        padding: 1rem !important;
      }
      
      .pricing-options {
        flex-direction: column !important;
        gap: 1rem !important;
      }
    }
    
    /* Fix wizard card display */
    .wizard-card {
      background: white !important;
      border-radius: 1rem !important;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
      border: 1px solid #e5e7eb !important;
    }
    
    /* Fix button animations */
    .subscribe-button {
      animation: pulse-glow 2s ease-in-out infinite !important;
    }
    
    @keyframes pulse-glow {
      0%, 100% { 
        box-shadow: 0 0 0 0 rgba(50, 80, 250, 0.4);
        transform: scale(1);
      }
      50% { 
        box-shadow: 0 0 0 10px rgba(50, 80, 250, 0);
        transform: scale(1.05);
      }
    }
    
    /* Fix progress indicators */
    .progress-indicator {
      background: #f3f4f6 !important;
      border-radius: 0.5rem !important;
      overflow: hidden !important;
    }
    
    .progress-bar {
      background: linear-gradient(90deg, #3250fa, #00f0ff) !important;
      transition: width 0.3s ease !important;
    }
    
    /* Fix text readability */
    .text-muted-foreground {
      color: #6b7280 !important;
    }
    
    .text-primary {
      color: #3250fa !important;
    }
    
    /* Fix card hover effects */
    .feature-card:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1) !important;
      border-color: #3250fa !important;
    }
  `;
  
  document.head.appendChild(style);
  
  // Fix image loading issues
  const images = document.querySelectorAll('img[src*="attached_assets"]');
  images.forEach(img => {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('/')) {
      img.setAttribute('src', '/' + src);
    }
    
    // Add error handling
    img.addEventListener('error', function() {
      this.style.display = 'none';
      console.log('Image failed to load:', this.src);
    });
  });
  
  // Fix wizard display issues
  const wizardElements = document.querySelectorAll('.onboarding-wizard, [class*="wizard"]');
  wizardElements.forEach(element => {
    element.style.maxWidth = '100%';
    element.style.margin = '0 auto';
    element.style.padding = '1rem';
  });
  
  // Fix button responsiveness
  const buttons = document.querySelectorAll('button, .btn');
  buttons.forEach(button => {
    button.style.minHeight = '44px'; // Touch-friendly
    button.style.padding = '0.75rem 1.5rem';
  });
  
  // Fix text overflow issues
  const textElements = document.querySelectorAll('h1, h2, h3, p');
  textElements.forEach(element => {
    element.style.wordBreak = 'break-word';
    element.style.overflowWrap = 'break-word';
  });
  
  console.log('✅ UI fixes applied successfully');
}

// Apply fixes when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fixSplashUI);
} else {
  fixSplashUI();
}

// Apply fixes on route changes
window.addEventListener('popstate', fixSplashUI);