const User = require("./User");
const Student = require("./Student");
const Class = require("./Class");
const Jurusan = require("./Jurusan");
const Item = require("./Item");
const Bill = require("./Bill");
const Payment = require("./Payment");
const Session = require("./Session");
const CooperativeProfile = require("./CooperativeProfile");
const UserSecuritySettings = require("./UserSecuritySettings");
const SystemSecuritySettings = require("./SystemSecuritySettings");
const RecoveryCode = require("./RecoveryCode");
const LoginHistory = require("./LoginHistory");

Student.belongsTo(Class, {
  foreignKey: "classId",
});

Class.hasMany(Student, {
  foreignKey: "classId",
});

Class.belongsTo(Jurusan, {
  foreignKey: "jurusanId",
});

Jurusan.hasMany(Class, {
  foreignKey: "jurusanId",
});

Student.belongsTo(Jurusan, {
  foreignKey: "jurusanId",
});

Jurusan.hasMany(Student, {
  foreignKey: "jurusanId",
});

Bill.belongsTo(Student, {
  foreignKey: "studentId",
});

Student.hasMany(Bill, {
  foreignKey: "studentId",
});

Bill.belongsTo(Item, {
  foreignKey: "itemId",
});

Item.hasMany(Bill, {
  foreignKey: "itemId",
});

Payment.belongsTo(Bill, {
  foreignKey: "billId",
});

Bill.hasMany(Payment, {
  foreignKey: "billId",
});

Payment.belongsTo(User, {
  foreignKey: "userId",
});

User.hasMany(Payment, {
  foreignKey: "userId",
});

User.hasMany(Session, { foreignKey: "userId" });
Session.belongsTo(User, { foreignKey: "userId" });
User.hasOne(UserSecuritySettings, { foreignKey: "userId" });
UserSecuritySettings.belongsTo(User, { foreignKey: "userId" });
User.hasMany(RecoveryCode, { foreignKey: "userId" });
RecoveryCode.belongsTo(User, { foreignKey: "userId" });
User.hasMany(LoginHistory, { foreignKey: "userId" });
LoginHistory.belongsTo(User, { foreignKey: "userId" });

module.exports = {
  User,
  Student,
  Class,
  Jurusan,
  Item,
  Bill,
  Payment,
  Session,
  CooperativeProfile,
  UserSecuritySettings,
  SystemSecuritySettings,
  RecoveryCode,
  LoginHistory,
};
