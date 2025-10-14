-- CreateEnum
CREATE TYPE "public"."event_level" AS ENUM ('Beginner', 'Intermediate', 'Advanced', 'All');

-- CreateEnum
CREATE TYPE "public"."sport_type" AS ENUM ('Football', 'Basketball', 'Tennis', 'Volleyball', 'Badminton', 'Ping_pong', 'Swimming', 'Running', 'Cycling', 'Climbing', 'Hiking', 'Surfing', 'Skiing', 'Snowboarding', 'Padel', 'Other');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "birth_date" DATE,
    "region" VARCHAR(100),
    "phone_number" VARCHAR(20),
    "favorite_sports" "public"."sport_type"[] DEFAULT ARRAY[]::"public"."sport_type"[],
    "rating_average" DECIMAL(3,2) DEFAULT 0.00,
    "rating_count" INTEGER DEFAULT 0,
    "stats" JSONB DEFAULT '{}',
    "preferences" JSONB DEFAULT '{}',
    "device_tokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "profile_picture_url" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(200) NOT NULL,
    "sport" "public"."sport_type" NOT NULL,
    "location_name" VARCHAR(200) NOT NULL,
    "location_address" TEXT NOT NULL,
    "location_city" VARCHAR(100) NOT NULL,
    "location_country" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "date_time" TIMESTAMPTZ(6) NOT NULL,
    "duration" INTEGER NOT NULL,
    "total_slots" INTEGER NOT NULL,
    "available_slots" INTEGER NOT NULL,
    "organizer_id" UUID NOT NULL,
    "organizer_slots" INTEGER DEFAULT 1,
    "description" TEXT,
    "price" DECIMAL(10,2),
    "levels" "public"."event_level"[] DEFAULT ARRAY['All']::"public"."event_level"[],
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."participants" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "guests" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pending_participants" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "guests" INTEGER DEFAULT 0,
    "comment" TEXT,
    "requested_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."conversations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "event_id" UUID NOT NULL,
    "last_message_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "type" VARCHAR(50) DEFAULT 'text',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reviews" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "reviewer_id" UUID NOT NULL,
    "reviewed_user_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE INDEX "idx_events_city" ON "public"."events"("location_city");

-- CreateIndex
CREATE INDEX "idx_events_date" ON "public"."events"("date_time");

-- CreateIndex
CREATE INDEX "idx_events_location" ON "public"."events"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "idx_events_sport" ON "public"."events"("sport");

-- CreateIndex
CREATE INDEX "idx_participants_event" ON "public"."participants"("event_id");

-- CreateIndex
CREATE INDEX "idx_participants_user" ON "public"."participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "participants_user_id_event_id_key" ON "public"."participants"("user_id", "event_id");

-- CreateIndex
CREATE INDEX "idx_pending_participants_event" ON "public"."pending_participants"("event_id");

-- CreateIndex
CREATE INDEX "idx_pending_participants_user" ON "public"."pending_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pending_participants_user_id_event_id_key" ON "public"."pending_participants"("user_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_event_id_key" ON "public"."conversations"("event_id");

-- CreateIndex
CREATE INDEX "idx_messages_conversation" ON "public"."messages"("conversation_id");

-- CreateIndex
CREATE INDEX "idx_messages_read" ON "public"."messages"("read");

-- CreateIndex
CREATE INDEX "idx_messages_conversation_read" ON "public"."messages"("conversation_id", "read");

-- CreateIndex
CREATE INDEX "idx_notifications_created" ON "public"."notifications"("created_at");

-- CreateIndex
CREATE INDEX "idx_notifications_user" ON "public"."notifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_reviews_reviewed_user" ON "public"."reviews"("reviewed_user_id");

-- CreateIndex
CREATE INDEX "idx_reviews_event" ON "public"."reviews"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_reviewer_id_event_id_key" ON "public"."reviews"("reviewer_id", "event_id");

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."participants" ADD CONSTRAINT "participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."participants" ADD CONSTRAINT "participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."pending_participants" ADD CONSTRAINT "pending_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."pending_participants" ADD CONSTRAINT "pending_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."conversations" ADD CONSTRAINT "conversations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_reviewed_user_id_fkey" FOREIGN KEY ("reviewed_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
