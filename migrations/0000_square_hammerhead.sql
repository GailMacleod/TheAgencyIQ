CREATE TABLE "brand_purpose" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"brand_name" text NOT NULL,
	"products_services" text NOT NULL,
	"core_purpose" text NOT NULL,
	"audience" text NOT NULL,
	"job_to_be_done" text NOT NULL,
	"motivations" text NOT NULL,
	"pain_points" text NOT NULL,
	"goals" jsonb NOT NULL,
	"logo_url" text,
	"contact_details" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gift_certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"plan" varchar(20) NOT NULL,
	"is_used" boolean DEFAULT false,
	"created_for" varchar(100) NOT NULL,
	"redeemed_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"redeemed_at" timestamp,
	CONSTRAINT "gift_certificates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "platform_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"platform" text NOT NULL,
	"platform_user_id" text NOT NULL,
	"platform_username" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"connected_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_ledger" (
	"user_id" text PRIMARY KEY NOT NULL,
	"subscription_tier" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"quota" integer NOT NULL,
	"used_posts" integer DEFAULT 0 NOT NULL,
	"last_posted" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_schedule" (
	"post_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"platform" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_counted" boolean DEFAULT false NOT NULL,
	"scheduled_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"platform" text NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"error_log" text,
	"analytics" jsonb,
	"scheduled_for" timestamp,
	"ai_recommendation" text,
	"subscription_cycle" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subscription_cycle" text NOT NULL,
	"subscription_plan" text NOT NULL,
	"total_posts_allowed" integer NOT NULL,
	"posts_used" integer DEFAULT 0,
	"successful_posts" integer DEFAULT 0,
	"total_reach" integer DEFAULT 0,
	"total_engagement" integer DEFAULT 0,
	"total_impressions" integer DEFAULT 0,
	"cycle_start_date" timestamp NOT NULL,
	"cycle_end_date" timestamp NOT NULL,
	"data_retention_expiry" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"phone" text,
	"subscription_plan" text,
	"subscription_start" timestamp,
	"remaining_posts" integer DEFAULT 0,
	"total_posts" integer DEFAULT 0,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "brand_purpose" ADD CONSTRAINT "brand_purpose_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_certificates" ADD CONSTRAINT "gift_certificates_redeemed_by_users_id_fk" FOREIGN KEY ("redeemed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_connections" ADD CONSTRAINT "platform_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_analytics" ADD CONSTRAINT "subscription_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");