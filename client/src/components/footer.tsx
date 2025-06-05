export default function Footer() {
  return (
    <footer className="bg-background py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm text-foreground mb-2 lowercase">macleodglba t/a the agencyiq</p>
        <div className="space-x-6">
          <a 
            href="https://yourwebsite.com/privacy-policy" 
            className="text-sm link-primary lowercase"
            target="_blank"
            rel="noopener noreferrer"
          >
            privacy policy
          </a>
          <a 
            href="https://yourwebsite.com/terms-of-service" 
            className="text-sm link-primary lowercase"
            target="_blank"
            rel="noopener noreferrer"
          >
            terms of service
          </a>
        </div>
      </div>
    </footer>
  );
}
