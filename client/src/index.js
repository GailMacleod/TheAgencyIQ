// Schedule page mobile layout detection and logging
if (window.matchMedia('(max-width: 768px)').matches) {
  console.log('Schedule layout adjusted for mobile');
  
  // Monitor generate buttons for responsiveness
  const checkButtonResponsiveness = () => {
    const generateButtons = document.querySelectorAll('.generate-button');
    generateButtons.forEach(button => {
      // Modern event listener with proper options
      button.addEventListener('click', (event) => {
        if (!button.offsetParent || button.disabled) {
          console.log('Reverting schedule layout');
        }
      }, { passive: true });
    });
  };
  
  // Check when DOM is loaded - modern approach
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkButtonResponsiveness, { once: true });
  } else {
    checkButtonResponsiveness();
  }
}