-- AlterTable
ALTER TABLE "battery_model" ADD COLUMN     "label" TEXT;

-- AlterTable
ALTER TABLE "controller_model" ADD COLUMN     "label" TEXT;

-- AlterTable
ALTER TABLE "device" ADD COLUMN     "icon_key" TEXT;

-- AlterTable
ALTER TABLE "device_category" ADD COLUMN     "icon_key" TEXT;

-- AlterTable
ALTER TABLE "inverter_model" ADD COLUMN     "label" TEXT;
