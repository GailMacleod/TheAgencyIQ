// Workflow UI Fix Script
// Addresses the specific workflow progress display issues visible in the screenshot

function fixWorkflowUI() {
  console.log('🔧 Fixing workflow UI display issues...');
  
  // Add enhanced styles for workflow progress section
  const workflowStyle = document.createElement('style');
  workflowStyle.textContent = `
    /* Fix workflow progress display */
    .workflow-progress {
      background: #f8fafc !important;
      border-radius: 0.75rem !important;
      padding: 1.5rem !important;
      border: 1px solid #e2e8f0 !important;
      margin-bottom: 1rem !important;
    }
    
    .workflow-progress h3 {
      color: #1e293b !important;
      font-size: 1.25rem !important;
      font-weight: 600 !important;
      margin-bottom: 0.5rem !important;
    }
    
    .workflow-progress p {
      color: #64748b !important;
      font-size: 0.875rem !important;
      line-height: 1.5 !important;
      margin-bottom: 1rem !important;
    }
    
    /* Fix platform connection indicators */
    .platform-indicator {
      display: inline-flex !important;
      align-items: center !important;
      gap: 0.5rem !important;
      padding: 0.25rem 0.75rem !important;
      border-radius: 0.5rem !important;
      font-size: 0.875rem !important;
      font-weight: 500 !important;
      margin-right: 0.5rem !important;
      margin-bottom: 0.5rem !important;
    }
    
    .platform-indicator.connected {
      background: #dcfce7 !important;
      color: #166534 !important;
      border: 1px solid #bbf7d0 !important;
    }
    
    .platform-indicator.disconnected {
      background: #fef2f2 !important;
      color: #991b1b !important;
      border: 1px solid #fecaca !important;
    }
    
    /* Fix step indicators */
    .step-indicator {
      display: flex !important;
      align-items: center !important;
      gap: 0.75rem !important;
      padding: 0.75rem !important;
      border-radius: 0.5rem !important;
      margin-bottom: 0.5rem !important;
      border: 1px solid #e5e7eb !important;
    }
    
    .step-indicator.complete {
      background: #f0f9ff !important;
      border-color: #3b82f6 !important;
    }
    
    .step-indicator.active {
      background: #fffbeb !important;
      border-color: #f59e0b !important;
    }
    
    .step-number {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 2rem !important;
      height: 2rem !important;
      border-radius: 50% !important;
      font-weight: 600 !important;
      font-size: 0.875rem !important;
    }
    
    .step-number.complete {
      background: #3b82f6 !important;
      color: white !important;
    }
    
    .step-number.active {
      background: #f59e0b !important;
      color: white !important;
    }
    
    .step-number.pending {
      background: #f3f4f6 !important;
      color: #6b7280 !important;
    }
    
    /* Fix posts scheduled display */
    .posts-scheduled {
      display: flex !important;
      align-items: center !important;
      gap: 0.5rem !important;
      padding: 0.75rem 1rem !important;
      background: #f0f9ff !important;
      border: 1px solid #bfdbfe !important;
      border-radius: 0.5rem !important;
      margin: 1rem 0 !important;
    }
    
    .posts-scheduled .count {
      font-weight: 600 !important;
      color: #1e40af !important;
    }
    
    /* Fix video generation indicator */
    .video-indicator {
      display: flex !important;
      align-items: center !important;
      gap: 0.5rem !important;
      padding: 0.5rem 1rem !important;
      background: #00f0ff !important;
      color: #000 !important;
      border-radius: 0.5rem !important;
      font-weight: 600 !important;
      font-size: 0.875rem !important;
      margin: 0.5rem 0 !important;
    }
    
    /* Fix beta label */
    .beta-label {
      display: inline-flex !important;
      align-items: center !important;
      gap: 0.25rem !important;
      padding: 0.25rem 0.75rem !important;
      background: rgba(50, 80, 250, 0.1) !important;
      color: #3250fa !important;
      border-radius: 9999px !important;
      font-size: 0.75rem !important;
      font-weight: 500 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
    }
    
    /* Fix responsive layout */
    @media (max-width: 768px) {
      .workflow-progress {
        padding: 1rem !important;
      }
      
      .step-indicator {
        flex-direction: column !important;
        text-align: center !important;
        gap: 0.5rem !important;
      }
      
      .platform-indicator {
        flex: 1 !important;
        justify-content: center !important;
      }
    }
  `;
  
  document.head.appendChild(workflowStyle);
  
  // Enhance workflow progress elements
  const workflowElements = document.querySelectorAll('[class*="workflow"], [class*="progress"]');
  workflowElements.forEach(element => {
    if (element.textContent.includes('Workflow Progress')) {
      element.classList.add('workflow-progress');
    }
  });
  
  // Fix platform connection displays
  const platformElements = document.querySelectorAll('[class*="platform"]');
  platformElements.forEach(element => {
    if (element.textContent.includes('Facebook') || 
        element.textContent.includes('Instagram') || 
        element.textContent.includes('LinkedIn') ||
        element.textContent.includes('YouTube') ||
        element.textContent.includes('TikTok')) {
      element.classList.add('platform-indicator');
      
      // Add connected/disconnected state
      if (element.textContent.includes('connected') || element.textContent.includes('✓')) {
        element.classList.add('connected');
      } else {
        element.classList.add('disconnected');
      }
    }
  });
  
  // Fix step indicators
  const stepElements = document.querySelectorAll('[class*="step"]');
  stepElements.forEach((element, index) => {
    element.classList.add('step-indicator');
    
    const stepNumber = document.createElement('div');
    stepNumber.className = 'step-number';
    stepNumber.textContent = (index + 1).toString();
    
    if (element.textContent.includes('Complete') || element.textContent.includes('✓')) {
      element.classList.add('complete');
      stepNumber.classList.add('complete');
    } else if (element.textContent.includes('Active') || element.textContent.includes('current')) {
      element.classList.add('active');
      stepNumber.classList.add('active');
    } else {
      stepNumber.classList.add('pending');
    }
    
    element.insertBefore(stepNumber, element.firstChild);
  });
  
  // Fix posts scheduled display
  const postsElements = document.querySelectorAll('[class*="posts"], [class*="scheduled"]');
  postsElements.forEach(element => {
    if (element.textContent.includes('posts scheduled') || element.textContent.includes('52 posts')) {
      element.classList.add('posts-scheduled');
      
      // Extract and highlight the number
      const match = element.textContent.match(/(\d+)/);
      if (match) {
        const count = match[1];
        element.innerHTML = element.innerHTML.replace(count, `<span class="count">${count}</span>`);
      }
    }
  });
  
  // Fix video generation indicator
  const videoElements = document.querySelectorAll('[class*="video"]');
  videoElements.forEach(element => {
    if (element.textContent.includes('video') && element.textContent.includes('text-to-video')) {
      element.classList.add('video-indicator');
    }
  });
  
  // Fix beta labels
  const betaElements = document.querySelectorAll('[class*="beta"]');
  betaElements.forEach(element => {
    if (element.textContent.toUpperCase().includes('BETA')) {
      element.classList.add('beta-label');
    }
  });
  
  console.log('✅ Workflow UI fixes applied successfully');
}

// Apply fixes when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fixWorkflowUI);
} else {
  fixWorkflowUI();
}

// Also apply on dynamic content changes
const observer = new MutationObserver(fixWorkflowUI);
observer.observe(document.body, { childList: true, subtree: true });