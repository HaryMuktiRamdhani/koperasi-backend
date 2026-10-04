require("dotenv").config();

const bcrypt = require("bcrypt");
const { randomUUID } = require("crypto");

module.exports = {
  async up(queryInterface) {
    const password = await bcrypt.hash("Admin123!", 10);

    await queryInterface.bulkInsert("users", [
      {
        id: randomUUID(),
        name: "Administrator",
        email: "admin@koperasi.local",
        password,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("users", {
      email: "admin@koperasi.local",
    });
  },
};