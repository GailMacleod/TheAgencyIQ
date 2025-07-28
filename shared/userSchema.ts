// Brand purpose for content generation
export const brandPurpose = pgTable("brand_purpose", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  brandName: text("brand_name").notNull(),
  productsServices: text("products_services").notNull(),
  corePurpose: text("core_purpose").notNull(),
  audience: text("audience").notNull(),
  jobToBeDone: text("job_to_be_done").notNull(),
  motivations: text("motivations").notNull(),
  painPoints: text("pain_points").notNull(),
  goals: jsonb("goals").notNull(), // { driveTraffic: boolean, websiteUrl?: string, buildBrand: boolean, makeSales: boolean, salesUrl?: string, informEducate: boolean, keyMessage?: string }
  logoUrl: text("logo_url"),
  contactDetails: jsonb("contact_details").notNull(), // { email?: string, phone?: string }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Verification codes for phone verification
export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const giftCertificates = pgTable("gift_certificates", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  plan: varchar("plan", { length: 20 }).notNull(),
  isUsed: boolean("is_used").default(false),
  createdFor: varchar("created_for", { length: 100 }).notNull(),
  createdBy: integer("created_by").references(() => users.id), // Track who created the certificate
  redeemedBy: integer("redeemed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  redeemedAt: timestamp("redeemed_at"),
});

// Gift Certificate Action Log for comprehensive tracking
export const giftCertificateActionLog = pgTable("gift_certificate_action_log", {
  id: serial("id").primaryKey(),
  certificateId: integer("certificate_id").notNull().references(() => giftCertificates.id),
  certificateCode: varchar("certificate_code", { length: 50 }).notNull(),
  actionType: varchar("action_type", { length: 30 }).notNull(), // 'created', 'redeemed', 'viewed', 'attempted_redeem'
  actionBy: integer("action_by").references(() => users.id), // NULL for anonymous actions
  actionByEmail: varchar("action_by_email", { length: 255 }), // Track email for non-users
  actionDetails: jsonb("action_details"), // Store additional context
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 100 }),
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  fraudScore: integer("fraud_score").default(0), // Basic fraud scoring
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
