-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'EDITEUR');

-- CreateTable
CREATE TABLE "country" (
    "id" TEXT NOT NULL,
    "iso_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grid_voltage_v" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "region" (
    "id" TEXT NOT NULL,
    "country_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capital" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "irradiation_avg" DOUBLE PRECISION NOT NULL,
    "irradiation_min_month" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "device_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon_url" TEXT,
    "image_url" TEXT,
    "power_min_w" DOUBLE PRECISION NOT NULL,
    "power_typ_w" DOUBLE PRECISION NOT NULL,
    "power_max_w" DOUBLE PRECISION NOT NULL,
    "default_hours_per_day" DOUBLE PRECISION NOT NULL,
    "duty_cycle" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "surge_factor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "panel_model" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "power_wp" DOUBLE PRECISION NOT NULL,
    "voc_v" DOUBLE PRECISION NOT NULL,
    "vmp_v" DOUBLE PRECISION NOT NULL,
    "isc_a" DOUBLE PRECISION NOT NULL,
    "imp_a" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "panel_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battery_model" (
    "id" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "nominal_voltage_v" DOUBLE PRECISION NOT NULL,
    "capacity_ah" DOUBLE PRECISION NOT NULL,
    "dod" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "battery_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inverter_model" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nominal_power_w" DOUBLE PRECISION NOT NULL,
    "surge_factor" DOUBLE PRECISION NOT NULL,
    "dc_voltage_v" INTEGER NOT NULL,
    "efficiency" DOUBLE PRECISION NOT NULL,
    "mppt_max_current_a" DOUBLE PRECISION,
    "mppt_max_pv_voltage_v" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "inverter_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "controller_model" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "max_current_a" DOUBLE PRECISION NOT NULL,
    "max_pv_voltage_v" DOUBLE PRECISION NOT NULL,
    "max_input_current_a" DOUBLE PRECISION NOT NULL,
    "supported_voltages" INTEGER[],
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "controller_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cable_section" (
    "id" TEXT NOT NULL,
    "section_mm2" DOUBLE PRECISION NOT NULL,
    "allowable_current_a" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "cable_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "protection_rating" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rating_a" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "protection_rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameter_set" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "values" JSONB NOT NULL,
    "active_since" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parameter_set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation" (
    "id" UUID NOT NULL,
    "mode" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "autonomy_days" DOUBLE PRECISION NOT NULL,
    "battery_tech" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "overrides" JSONB,
    "result" JSONB NOT NULL,
    "engine_version" TEXT NOT NULL,
    "params_version" INTEGER NOT NULL,
    "share_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_user" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'EDITEUR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "failed_logins" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" TEXT NOT NULL,
    "admin_user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead" (
    "id" UUID NOT NULL,
    "simulation_id" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT,
    "message" TEXT,
    "consent_at" TIMESTAMP(3) NOT NULL,
    "ip_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "country_iso_code_key" ON "country"("iso_code");

-- CreateIndex
CREATE UNIQUE INDEX "region_country_id_name_key" ON "region"("country_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "device_category_name_key" ON "device_category"("name");

-- CreateIndex
CREATE INDEX "device_category_id_idx" ON "device"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "cable_section_section_mm2_key" ON "cable_section"("section_mm2");

-- CreateIndex
CREATE UNIQUE INDEX "protection_rating_type_rating_a_key" ON "protection_rating"("type", "rating_a");

-- CreateIndex
CREATE UNIQUE INDEX "parameter_set_version_key" ON "parameter_set"("version");

-- CreateIndex
CREATE UNIQUE INDEX "simulation_share_token_key" ON "simulation"("share_token");

-- CreateIndex
CREATE INDEX "simulation_created_at_idx" ON "simulation"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_email_key" ON "admin_user"("email");

-- CreateIndex
CREATE INDEX "audit_log_entity_entity_id_idx" ON "audit_log"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_token_admin_user_id_idx" ON "refresh_token"("admin_user_id");

-- AddForeignKey
ALTER TABLE "region" ADD CONSTRAINT "region_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device" ADD CONSTRAINT "device_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "device_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_set" ADD CONSTRAINT "parameter_set_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation" ADD CONSTRAINT "simulation_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_simulation_id_fkey" FOREIGN KEY ("simulation_id") REFERENCES "simulation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
