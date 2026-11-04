const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { CooperativeProfile } = require("../../models");

const uploadDirectory = path.resolve(__dirname, "../../uploads/cooperative");
const defaults = { name: "Koperasi Sekolah", subtitle: "KOPERASI SEKOLAH", logoUrl: null };
const imageTypes = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function getProfilePayload(profile) {
  return {
    name: profile.name,
    subtitle: profile.subtitle,
    logoUrl: profile.logoUrl || null,
  };
}

async function getOrCreateProfile() {
  const existing = await CooperativeProfile.findOne();
  return existing || CooperativeProfile.create(defaults);
}

async function getProfile(req, res) {
  try {
    const profile = await getOrCreateProfile();
    return res.json(getProfilePayload(profile));
  } catch (error) {
    console.error("Get cooperative profile error:", error);
    return res.status(500).json({ message: "Gagal mengambil identitas koperasi" });
  }
}

async function updateProfile(req, res) {
  let newFilePath = null;
  try {
    const profile = await getOrCreateProfile();
    const name = typeof req.body.name === "string" ? req.body.name.trim() : profile.name;
    const subtitle = typeof req.body.subtitle === "string" ? req.body.subtitle.trim() : profile.subtitle;
    if (!name || !subtitle || name.length > 150 || subtitle.length > 150) {
      return res.status(400).json({ message: "Nama sekolah dan subtitle wajib diisi maksimal 150 karakter" });
    }

    let logoUrl = profile.logoUrl;
    if (req.body.logoData === null) {
      logoUrl = null;
    } else if (typeof req.body.logoData === "string") {
      const match = req.body.logoData.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) return res.status(400).json({ message: "Logo harus berupa PNG, JPG, JPEG, atau WEBP yang valid" });
      const extension = Object.entries(imageTypes).find(([, mime]) => mime === match[1])?.[0];
      const buffer = Buffer.from(match[2], "base64");
      if (!extension || buffer.length === 0 || buffer.length > 2 * 1024 * 1024) {
        return res.status(400).json({ message: "Ukuran logo maksimal 2MB" });
      }
      await fs.mkdir(uploadDirectory, { recursive: true });
      const fileName = `${crypto.randomUUID()}.${extension}`;
      newFilePath = path.join(uploadDirectory, fileName);
      await fs.writeFile(newFilePath, buffer, { flag: "wx" });
      logoUrl = `/uploads/cooperative/${fileName}`;
    }

    const previousLogoUrl = profile.logoUrl;
    await profile.update({ name, subtitle, logoUrl });
    if (previousLogoUrl && previousLogoUrl !== logoUrl) {
      const previousPath = path.resolve(__dirname, "../..", previousLogoUrl.replace(/^\/+/, ""));
      await fs.rm(previousPath, { force: true });
    }
    return res.json({ message: "Identitas koperasi berhasil diperbarui", data: getProfilePayload(profile) });
  } catch (error) {
    if (newFilePath) await fs.rm(newFilePath, { force: true }).catch(() => undefined);
    console.error("Update cooperative profile error:", error);
    return res.status(500).json({ message: "Gagal menyimpan identitas koperasi" });
  }
}

module.exports = { getProfile, updateProfile };
