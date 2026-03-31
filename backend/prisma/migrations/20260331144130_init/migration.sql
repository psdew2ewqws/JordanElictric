-- CreateEnum
CREATE TYPE "Language" AS ENUM ('AR', 'EN');

-- CreateEnum
CREATE TYPE "DistributionCompany" AS ENUM ('JEPCO', 'IDECO', 'EDCO');

-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL');

-- CreateEnum
CREATE TYPE "BillSource" AS ENUM ('SCAN', 'MANUAL');

-- CreateEnum
CREATE TYPE "ComplaintType" AS ENUM ('OUTAGE', 'BILLING', 'METER', 'VOLTAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('MOBILE', 'WEB');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'BILL_READY', 'OUTAGE_UPDATE', 'SAVINGS_TIP', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "avatar_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "google_id" TEXT,
    "language" "Language" NOT NULL DEFAULT 'EN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "device_info" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscriber_number" TEXT NOT NULL,
    "distribution_company" "DistributionCompany" NOT NULL,
    "subscription_type" "SubscriptionType" NOT NULL DEFAULT 'RESIDENTIAL',
    "household_size" INTEGER NOT NULL DEFAULT 1,
    "meter_number" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "district" TEXT NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bills" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "billing_period_start" TIMESTAMP(3) NOT NULL,
    "billing_period_end" TIMESTAMP(3) NOT NULL,
    "total_amount_fils" INTEGER NOT NULL DEFAULT 0,
    "total_kwh" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "peak_kwh" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "off_peak_kwh" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "previous_reading" INTEGER NOT NULL DEFAULT 0,
    "current_reading" INTEGER NOT NULL DEFAULT 0,
    "due_date" TIMESTAMP(3) NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "source" "BillSource" NOT NULL DEFAULT 'MANUAL',
    "scanned_image_url" TEXT,
    "raw_ocr_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bill_line_items" (
    "id" TEXT NOT NULL,
    "bill_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "label_ar" TEXT NOT NULL DEFAULT '',
    "amount_fils" INTEGER NOT NULL DEFAULT 0,
    "kwh" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rate_per_kwh" INTEGER,
    "tariff_tier" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bill_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_tiers" (
    "id" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "tier_number" INTEGER NOT NULL,
    "min_kwh" INTEGER NOT NULL,
    "max_kwh" INTEGER NOT NULL,
    "rate_fils" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "label_ar" TEXT NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tariff_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_periods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL DEFAULT '',
    "start_hour" INTEGER NOT NULL,
    "end_hour" INTEGER NOT NULL,
    "multiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    "is_peak" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tariff_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "complaint_type" "ComplaintType" NOT NULL,
    "description" TEXT NOT NULL,
    "description_ar" TEXT NOT NULL DEFAULT '',
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "reference_number" TEXT NOT NULL DEFAULT '',
    "resolution_notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "platform" "Platform" NOT NULL DEFAULT 'MOBILE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "context" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "message_type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "tokens_used" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "processing_time_ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notification_type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "title_ar" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL,
    "message_ar" TEXT NOT NULL DEFAULT '',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "related_object_type" TEXT NOT NULL DEFAULT '',
    "related_object_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_logs" (
    "id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "latency_ms" INTEGER NOT NULL DEFAULT 0,
    "task_type" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "ip_address" TEXT,
    "user_agent" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_subscriber_number_key" ON "subscriptions"("subscriber_number");

-- CreateIndex
CREATE INDEX "bills_subscription_id_idx" ON "bills"("subscription_id");

-- CreateIndex
CREATE INDEX "bills_billing_period_end_idx" ON "bills"("billing_period_end" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "tariff_tiers_sector_tier_number_key" ON "tariff_tiers"("sector", "tier_number");

-- CreateIndex
CREATE INDEX "complaints_subscription_id_idx" ON "complaints"("subscription_id");

-- CreateIndex
CREATE INDEX "conversation_sessions_user_id_idx" ON "conversation_sessions"("user_id");

-- CreateIndex
CREATE INDEX "messages_session_id_idx" ON "messages"("session_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ai_logs_provider_created_at_idx" ON "ai_logs"("provider", "created_at" DESC);

-- CreateIndex
CREATE INDEX "user_activities_user_id_created_at_idx" ON "user_activities"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
