const User = require("./User");
const Student = require("./Student");
const Class = require("./Class");
const Jurusan = require("./Jurusan");
const Item = require("./Item");
const Bill = require("./Bill");
const Payment = require("./Payment");

// Student ↔ Class
Student.belongsTo(Class, {
  foreignKey: "classId",
});

Class.hasMany(Student, {
  foreignKey: "classId",
});

// Student ↔ Jurusan
Student.belongsTo(Jurusan, {
  foreignKey: "jurusanId",
});

Jurusan.hasMany(Student, {
  foreignKey: "jurusanId",
});

// Bill ↔ Student
Bill.belongsTo(Student, {
  foreignKey: "studentId",
});

Student.hasMany(Bill, {
  foreignKey: "studentId",
});

// Bill ↔ Item
Bill.belongsTo(Item, {
  foreignKey: "itemId",
});

Item.hasMany(Bill, {
  foreignKey: "itemId",
});

// Payment ↔ Bill
Payment.belongsTo(Bill, {
  foreignKey: "billId",
});

Bill.hasMany(Payment, {
  foreignKey: "billId",
});

// Payment ↔ User
Payment.belongsTo(User, {
  foreignKey: "userId",
});

User.hasMany(Payment, {
  foreignKey: "userId",
});

module.exports = {
  User,
  Student,
  Class,
  Jurusan,
  Item,
  Bill,
  Payment,
};