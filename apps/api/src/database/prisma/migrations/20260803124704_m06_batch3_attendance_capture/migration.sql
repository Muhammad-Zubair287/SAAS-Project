/*
  Warnings:

  - You are about to drop the column `deviceFingerprint` on the `attendance_device` table. All the data in the column will be lost.
  - You are about to drop the column `deviceType` on the `attendance_device` table. All the data in the column will be lost.
  - You are about to drop the column `publicKeyFingerprint` on the `attendance_device` table. All the data in the column will be lost.
  - You are about to drop the column `serialNumber` on the `attendance_device` table. All the data in the column will be lost.
  - You are about to drop the column `tokenHash` on the `attendance_device_token` table. All the data in the column will be lost.
  - Added the required column `device_type` to the `attendance_device` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token_hash` to the `attendance_device_token` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "attendance_device_tenant_serial_idx";

-- AlterTable
ALTER TABLE "attendance_device" DROP COLUMN "deviceFingerprint",
DROP COLUMN "deviceType",
DROP COLUMN "publicKeyFingerprint",
DROP COLUMN "serialNumber",
ADD COLUMN     "device_fingerprint" VARCHAR(128),
ADD COLUMN     "device_type" VARCHAR(64) NOT NULL,
ADD COLUMN     "public_key_fingerprint" VARCHAR(128),
ADD COLUMN     "serial_number" VARCHAR(128);

-- AlterTable
ALTER TABLE "attendance_device_token" DROP COLUMN "tokenHash",
ADD COLUMN     "token_hash" VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE INDEX "attendance_device_tenant_serial_idx" ON "attendance_device"("tenant_id", "serial_number");
