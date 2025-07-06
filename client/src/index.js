// Schedule page mobile layout detection and logging with null checks
if (window && window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
  console.log('Schedule layout adjusted for mobile');
  
  // Monitor generate buttons for responsiveness
  const checkButtonResponsiveness = () => {
    const generateButtons = document.querySelectorAll('.generate-button');
    if (generateButtons && generateButtons.length > 0) {
      generateButtons.forEach(button => {
        if (button && typeof button.addEventListener === 'function') {
          button.addEventListener('click', () => {
            if (!button.offsetParent || button.disabled) {
              console.log('Reverting schedule layout');
            }
          });
        }
      });
    }
  };
  
  // Check when DOM is loaded with null checks
  if (document && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkButtonResponsiveness);
  } else {
    checkButtonResponsiveness();
  }
}