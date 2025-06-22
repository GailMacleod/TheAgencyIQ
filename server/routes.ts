import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { setupOAuthBlueprint } from "./oauth-blueprint";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = './uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Use original filename with timestamp to avoid conflicts
    const ext = path.extname(file.originalname);
    cb(null, `logo-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Check file type
    if (file.mimetype.match(/^image\/(png|jpeg|jpg|webp)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, JPEG, and WEBP files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Parse JSON and URL-encoded bodies
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static files from uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Setup OAuth Blueprint - Phone-based connections
  setupOAuthBlueprint(app);

  // Logo upload endpoint
  app.post("/api/upload-logo", upload.single("logo"), async (req: any, res) => {
    try {
      // Check Authorization token
      const token = req.headers.authorization;
      if (token !== 'valid-token') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Move uploaded file to standard logo.png location
      const targetPath = path.join('./uploads', 'logo.png');
      
      // Remove existing logo if it exists
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }

      // Move new file to logo.png
      fs.renameSync(req.file.path, targetPath);

      const logoUrl = '/uploads/logo.png';

      res.status(200).json({ 
        message: "Logo uploaded successfully", 
        logoUrl,
        filename: req.file.originalname,
        size: req.file.size
      });
    } catch (error: any) {
      console.error('Logo upload error:', error);
      res.status(400).json({ message: error.message || "Upload failed" });
    }
  });

  // Brand purpose endpoints
  app.get("/api/brand-purpose", async (req, res) => {
    try {
      // For now, return empty data - this will be enhanced with database storage
      res.json(null);
    } catch (error: any) {
      console.error('Brand purpose fetch error:', error);
      res.status(500).json({ message: "Failed to fetch brand purpose" });
    }
  });

  app.post("/api/brand-purpose", async (req, res) => {
    try {
      const brandData = req.body;
      
      // For now, just acknowledge receipt - this will be enhanced with database storage
      console.log('Brand purpose saved:', {
        brandName: brandData.brandName,
        logoUrl: brandData.logoUrl,
        fieldsCompleted: Object.keys(brandData).length
      });

      res.json({ 
        message: "Brand purpose saved successfully",
        data: brandData
      });
    } catch (error: any) {
      console.error('Brand purpose save error:', error);
      res.status(500).json({ message: "Failed to save brand purpose" });
    }
  });

  // Strategyzer analysis endpoint
  app.post("/api/strategyzer", async (req, res) => {
    try {
      const { brandName, productsServices, corePurpose } = req.body;
      
      // Return structured Strategyzer analysis instantly
      const analysis = {
        valueProposition: {
          products: `${brandName} offers ${productsServices} designed to ${corePurpose}`,
          gainCreators: [
            "Solves specific customer pain points",
            "Delivers measurable business value",
            "Provides competitive advantage"
          ],
          painRelievers: [
            "Eliminates common industry frustrations",
            "Reduces operational complexity",
            "Minimizes risk and uncertainty"
          ]
        },
        customerSegment: {
          jobs: [
            "Growing their business sustainably",
            "Improving operational efficiency",
            "Building customer relationships"
          ],
          pains: [
            "Limited time for strategic thinking",
            "Difficulty measuring ROI",
            "Keeping up with market changes"
          ],
          gains: [
            "Increased revenue and profitability",
            "Better customer satisfaction",
            "Streamlined operations"
          ]
        },
        recommendations: {
          targetAudience: "Queensland small business owners seeking growth",
          valueMessage: `${brandName} helps Queensland businesses ${corePurpose.toLowerCase()} through ${productsServices.toLowerCase()}`,
          differentiators: [
            "Local Queensland market expertise",
            "Tailored solutions for small businesses",
            "Proven results and testimonials"
          ]
        }
      };

      res.json(analysis);
    } catch (error: any) {
      console.error('Strategyzer analysis error:', error);
      res.status(500).json({ message: "Failed to generate analysis" });
    }
  });

  // Basic health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}