const convert = require('json-schema-to-mongoose');
const mongoose = require('mongoose');
const softDelete = require('mongoosejs-soft-delete');
const moment = require('moment');
const bcrypt = require('bcryptjs');
const schemas = require('../schemas');

const schema = new mongoose.Schema(convert({}, schemas.user), {
    toJSON: {
        transform(doc, ret) {
            delete ret.__v;
            delete ret.password;
        },
    },
    toObject: {
        transform(doc, ret) {
            delete ret._id;
            delete ret.__v;
        },
    },
});

schema.plugin(softDelete);

const User = mongoose.model('User', schema, 'users');

/**
 * User model
 *
 * @type {User}
 */
module.exports = User;

/**
 * Encrypt the password and save new user to db
 *
 * @param {Object} user - user entity
 * @return {Promise} resolves with save result or rejects with an error
 */
module.exports.createUser = async (user) => {
    user.password = await bcrypt.hash(user.password, 12);
    user.created_at = moment.utc();

    return user.save();
};

/**
 * Update existing user
 *
 * @param {String} id - user id
 * @param {Object} update - object with fields that should be updated
 *
 * @return {Promise} resolves with update result or rejects with an error
 */
module.exports.updateUser = (id, update) => {
    update.updated_at = moment.utc();
    const opts = { new: true, runValidators: true };

    return User.findOneAndUpdate({ _id: id }, update, opts);
};

/**
 * Soft-delete existing user
 *
 * @param {String} id - user id
 * @return {Promise} resolves with save result or rejects with an error
 */
module.exports.deleteUser = async (id) => User.findOneAndDelete({ _id: id });

/**
 * Find user by email
 *
 * @param {String} email - user email
 * @param {Boolean} includeDeleted - search over deleted users as well
 *
 * @return {Promise} resolves with user or rejects with an error
 */
module.exports.findByEmail = (email, includeDeleted = false) =>
    User[includeDeleted ? 'findOneWithDeleted' : 'findOne']({ email });

/**
 * Find user by id
 *
 * @param {String} id - uuid
 * @param {Boolean} includeDeleted - search over deleted users as well
 *
 * @return {Promise} resolves with user or rejects with an error
 */
module.exports.findById = (id, includeDeleted = false) =>
    User[includeDeleted ? 'findOneWithDeleted' : 'findOne']({ _id: id });

/**
 * Get all users
 *
 * @param {Boolean} includeDeleted - include deleted users in result
 * @return {Promise} resolves with users or rejects with an error
 */
module.exports.getAll = (includeDeleted) =>
    User[includeDeleted ? 'findWithDeleted' : 'find']({}, {
        // Exclude properties from the result
        __v: 0,
        password: 0,
    });

/**
 * Check if provided password matches the hash in db
 *
 * @param {String} password - user plain password
 * @param {String} hash - user hashed password
 *
 * @return {Promise} resolves with comparing result or rejects with an error
 */
module.exports.passwordCheck = (password, hash) => bcrypt.compare(password, hash);
