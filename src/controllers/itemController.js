const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const Item = require("../../models/Item");

const ITEM_STATUSES = ["Aktif", "Nonaktif", "Akan Datang"];
const MAX_NAME_LENGTH = 150;
const MAX_PRICE = 2000000000;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const IMAGE_EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const uploadDirectory = path.resolve(__dirname, "../../uploads/items");

class ImageError extends Error {}

function validateStatus(status) {
  return ITEM_STATUSES.includes(status) ? null : "Status barang tidak valid.";
}

function validateName(name) {
  if (typeof name !== "string" || !name.trim()) {
    return "Nama barang wajib diisi.";
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    return `Nama barang maksimal ${MAX_NAME_LENGTH} karakter.`;
  }
  return null;
}

function parsePrice(price) {
  if (typeof price !== "number" && typeof price !== "string") return null;
  if (typeof price === "string" && price.trim() === "") return null;
  const value = Number(price);
  if (!Number.isInteger(value) || value < 0 || value > MAX_PRICE) return null;
  return value;
}

function hasValidSignature(buffer, mimeType) {
  if (mimeType === "image/png") {
    return buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  }
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/webp") {
    return (
      buffer.length > 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

async function saveImage(dataUrl) {
  const match =
    typeof dataUrl === "string" &&
    dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new ImageError(
      "Gambar harus berupa PNG, JPG, JPEG, atau WEBP yang valid",
    );
  }

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_SIZE) {
    throw new ImageError("Ukuran gambar maksimal 2MB");
  }
  if (!hasValidSignature(buffer, mimeType)) {
    throw new ImageError("Isi file bukan gambar yang valid");
  }

  await fs.mkdir(uploadDirectory, { recursive: true });
  const fileName = `${crypto.randomUUID()}.${IMAGE_EXTENSIONS[mimeType]}`;
  const filePath = path.join(uploadDirectory, fileName);
  await fs.writeFile(filePath, buffer, { flag: "wx" });

  return { imageUrl: `/uploads/items/${fileName}` };
}

async function removeImageFile(imageUrl) {
  if (!imageUrl) return;
  const filePath = path.resolve(
    __dirname,
    "../..",
    imageUrl.replace(/^\/+/, ""),
  );
  // Hanya hapus file yang memang berada di folder uploads/items
  if (!filePath.startsWith(uploadDirectory + path.sep)) return;
  await fs.rm(filePath, { force: true }).catch(() => undefined);
}

async function getAll(req, res) {
  try {
    const data = await Item.findAll({
      order: [["name", "ASC"]],
    });

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data barang",
    });
  }
}

async function create(req, res) {
  let newImage = null;

  try {
    const { name, price, status = "Aktif", imageData } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({
        message: "Nama dan harga wajib diisi",
      });
    }

    const nameError = validateName(name);
    if (nameError) return res.status(400).json({ message: nameError });

    const priceNumber = parsePrice(price);
    if (priceNumber === null) {
      return res.status(400).json({
        message: "Harga harus berupa angka bulat 0 atau lebih.",
      });
    }

    const statusError = validateStatus(status);
    if (statusError) return res.status(400).json({ message: statusError });

    if (typeof imageData === "string") {
      newImage = await saveImage(imageData);
    }

    const data = await Item.create({
      name: name.trim(),
      price: priceNumber,
      status,
      imageUrl: newImage ? newImage.imageUrl : null,
    });

    res.status(201).json({
      message: "Barang berhasil ditambahkan",
      data,
    });
  } catch (error) {
    if (newImage) await removeImageFile(newImage.imageUrl);

    if (error instanceof ImageError) {
      return res.status(400).json({ message: error.message });
    }

    console.error(error);

    res.status(500).json({
      message: "Gagal menambahkan barang",
    });
  }
}

async function update(req, res) {
  let newImage = null;

  try {
    const data = await Item.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Barang tidak ditemukan",
      });
    }

    const nextName = req.body.name === undefined ? data.name : req.body.name;
    const nameError = validateName(nextName);
    if (nameError) return res.status(400).json({ message: nameError });

    const nextPrice =
      req.body.price === undefined ? data.price : parsePrice(req.body.price);
    if (nextPrice === null) {
      return res.status(400).json({
        message: "Harga harus berupa angka bulat 0 atau lebih.",
      });
    }

    const nextStatus =
      req.body.status === undefined ? data.status || "Aktif" : req.body.status;
    const statusError = validateStatus(nextStatus);
    if (statusError) return res.status(400).json({ message: statusError });

    const previousImageUrl = data.imageUrl || null;
    let nextImageUrl = previousImageUrl;

    if (req.body.imageData === null) {
      nextImageUrl = null;
    } else if (typeof req.body.imageData === "string") {
      newImage = await saveImage(req.body.imageData);
      nextImageUrl = newImage.imageUrl;
    }

    await data.update({
      name: nextName.trim(),
      price: nextPrice,
      status: nextStatus,
      imageUrl: nextImageUrl,
    });

    if (previousImageUrl && previousImageUrl !== nextImageUrl) {
      await removeImageFile(previousImageUrl);
    }

    res.json({
      message: "Barang berhasil diperbarui",
      data,
    });
  } catch (error) {
    if (newImage) await removeImageFile(newImage.imageUrl);

    if (error instanceof ImageError) {
      return res.status(400).json({ message: error.message });
    }

    console.error(error);

    res.status(500).json({
      message: "Gagal memperbarui barang",
    });
  }
}

async function remove(req, res) {
  try {
    const data = await Item.findByPk(req.params.id);

    if (!data) {
      return res.status(404).json({
        message: "Barang tidak ditemukan",
      });
    }

    const imageUrl = data.imageUrl;
    await data.destroy();
    await removeImageFile(imageUrl);

    res.json({
      message: "Barang berhasil dihapus",
    });
  } catch (error) {
    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({
        message:
          "Barang tidak bisa dihapus karena sudah dipakai pada tagihan. Ubah statusnya menjadi Nonaktif saja.",
      });
    }

    console.error(error);

    res.status(500).json({
      message: "Gagal menghapus barang",
    });
  }
}

module.exports = {
  getAll,
  create,
  update,
  remove,
};