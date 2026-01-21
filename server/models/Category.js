const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    icon: {
        type: String,
        default: '📋'
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for efficient shop-based queries
categorySchema.index({ shopId: 1, order: 1 });

module.exports = mongoose.model('Category', categorySchema);
