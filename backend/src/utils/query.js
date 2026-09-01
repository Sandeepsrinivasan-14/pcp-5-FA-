const mongoose = require('mongoose');
const config = require('../config');

/**
 * Escape user input before embedding it in a RegExp. Without this a search for
 * "a{1,999999}" becomes a catastrophic-backtracking denial of service, and
 * characters like "." silently match more than the user asked for.
 */
const escapeRegex = (input) => String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const caseInsensitive = (input) => new RegExp(escapeRegex(input), 'i');

/**
 * Look a document up by either its Mongo _id or its human-facing business id
 * (PRJ-…, ISS-…, usr-…). Every route in this API accepts both.
 */
const findByAnyId = async (Model, id, businessIdField, populate = []) => {
    const filter = mongoose.Types.ObjectId.isValid(id)
        ? { _id: id }
        : { [businessIdField]: id };

    let query = Model.findOne(filter);
    for (const path of populate) {
        query = query.populate(path.path || path, path.select);
    }
    return query;
};

/**
 * Resolve a reference that may arrive as an _id or a business id, returning the
 * ObjectId or null when no such document exists.
 */
const resolveRef = async (Model, value, businessIdField) => {
    if (value === null || value === undefined || value === '') return null;
    if (mongoose.Types.ObjectId.isValid(value)) return value;
    const doc = await Model.findOne({ [businessIdField]: value }).select('_id');
    return doc ? doc._id : null;
};

/**
 * Clamp pagination input. An unbounded `limit` lets a single request ask the
 * database for every document it holds.
 */
const paginate = (query) => {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const requested = parseInt(query.limit, 10) || config.pagination.defaultLimit;
    const limit = Math.min(Math.max(1, requested), config.pagination.maxLimit);
    return { page, limit, skip: (page - 1) * limit };
};

module.exports = { escapeRegex, caseInsensitive, findByAnyId, resolveRef, paginate };
