CREATE TABLE "lead_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"source_id" text NOT NULL,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"category" text,
	"niche" text,
	"phone_raw" text,
	"phone_e164" text,
	"phone_display" text,
	"phone_type" text,
	"address" text,
	"locality" text,
	"city" text,
	"state" text,
	"country" text,
	"lat" double precision,
	"lon" double precision,
	"website_url" text,
	"website_status" text DEFAULT 'unknown' NOT NULL,
	"website_weak" boolean DEFAULT false NOT NULL,
	"website_evidence" text,
	"website_checked_at" timestamp with time zone,
	"instagram_url" text,
	"facebook_url" text,
	"profile_url" text,
	"opening_hours" text,
	"rating" double precision,
	"rating_count" integer,
	"quality_score" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"notes" text,
	"follow_up_at" timestamp with time zone,
	"contacted_at" timestamp with time zone,
	"source" text NOT NULL,
	"attribution" text,
	"search_job_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"params" jsonb NOT NULL,
	"target" integer NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"cursor" jsonb,
	"found_count" integer DEFAULT 0 NOT NULL,
	"scanned_count" integer DEFAULT 0 NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"skipped_no_phone" integer DEFAULT 0 NOT NULL,
	"skipped_website" integer DEFAULT 0 NOT NULL,
	"skipped_other" integer DEFAULT 0 NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stop_reason" text,
	"locked_until" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "lead_sources" ADD CONSTRAINT "lead_sources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_sources" ADD CONSTRAINT "lead_sources_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_search_job_id_search_jobs_id_fk" FOREIGN KEY ("search_job_id") REFERENCES "public"."search_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_jobs" ADD CONSTRAINT "search_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_sources_uq" ON "lead_sources" USING btree ("user_id","provider","source_id");--> statement-breakpoint
CREATE INDEX "lead_sources_lead_idx" ON "lead_sources" USING btree ("lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_user_phone_uq" ON "leads" USING btree ("user_id","phone_e164") WHERE "leads"."phone_e164" is not null;--> statement-breakpoint
CREATE INDEX "leads_user_name_idx" ON "leads" USING btree ("user_id","name_key");--> statement-breakpoint
CREATE INDEX "leads_user_created_idx" ON "leads" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "leads_user_status_idx" ON "leads" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "search_jobs_user_idx" ON "search_jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");