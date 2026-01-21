const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    image: {
        type: String,
        default: ''
    },
    available: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient shop-based queries
itemSchema.index({ shopId: 1, categoryId: 1 });

module.exports = mongoose.model('Item', itemSchema);
