import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function Dashboard() {
    const { shopSlug } = useParams();
    const [shop, setShop] = useState(null);
    const [menuData, setMenuData] = useState({ categories: [], items: [] });
    const [activeTab, setActiveTab] = useState('items');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('item');
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [uploading, setUploading] = useState(false);
    const navigate = useNavigate();

    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!token) {
            navigate(`/${shopSlug}/admin`);
            return;
        }
        fetchMenu();
    }, [shopSlug, navigate, token]);

    const fetchMenu = async () => {
        try {
            const response = await fetch(`${API_URL}/shops/${shopSlug}/menu`);
            const data = await response.json();
            setShop(data.shop);
            setMenuData({ categories: data.categories, items: data.items });
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch menu:', error);
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('shop');
        navigate(`/${shopSlug}/admin`);
    };

    // Image upload
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formDataUpload = new FormData();
        formDataUpload.append('image', file);

        try {
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formDataUpload
            });

            const result = await response.json();
            if (result.success) {
                setFormData({ ...formData, image: result.url });
            }
        } catch (error) {
            console.error('Upload error:', error);
        } finally {
            setUploading(false);
        }
    };

    // CRUD operations
    const openItemModal = (item = null) => {
        setModalType('item');
        setEditingItem(item);
        setFormData(item || {
            name: '',
            description: '',
            price: '',
            categoryId: menuData.categories[0]?.id || '',
            available: true,
            image: ''
        });
        setShowModal(true);
    };

    const saveItem = async () => {
        try {
            const url = editingItem
                ? `${API_URL}/shops/${shopSlug}/items/${editingItem.id}`
                : `${API_URL}/shops/${shopSlug}/items`;

            await fetch(url, {
                method: editingItem ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            fetchMenu();
            setShowModal(false);
        } catch (error) {
            console.error('Failed to save item:', error);
        }
    };

    const deleteItem = async (id) => {
        if (!window.confirm('Delete this item?')) return;

        await fetch(`${API_URL}/shops/${shopSlug}/items/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchMenu();
    };

    const openCategoryModal = (category = null) => {
        setModalType('category');
        setEditingItem(category);
        setFormData(category || { name: '', icon: '📋' });
        setShowModal(true);
    };

    const saveCategory = async () => {
        try {
            const url = editingItem
                ? `${API_URL}/shops/${shopSlug}/categories/${editingItem.id}`
                : `${API_URL}/shops/${shopSlug}/categories`;

            await fetch(url, {
                method: editingItem ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            fetchMenu();
            setShowModal(false);
        } catch (error) {
            console.error('Failed to save category:', error);
        }
    };

    const deleteCategory = async (id) => {
        if (!window.confirm('Delete this category and all its items?')) return;

        await fetch(`${API_URL}/shops/${shopSlug}/categories/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchMenu();
    };

    const getCategoryName = (categoryId) => {
        const cat = menuData.categories.find(c => c.id === categoryId);
        return cat ? cat.name : 'Unknown';
    };

    const getCategoryIcon = (categoryId) => {
        const cat = menuData.categories.find(c => c.id === categoryId);
        return cat ? cat.icon : '📋';
    };

    const menuUrl = `${window.location.origin}/${shopSlug}`;

    if (loading) {
        return (
            <div className="dashboard">
                <div className="loading" style={{ width: '100%' }}>
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <aside className="sidebar">
                <div className="sidebar-header">
                    {shop?.logo ? (
                        <img src={shop.logo} alt={shop.name} className="sidebar-logo-img" />
                    ) : (
                        <>
                            <span className="sidebar-logo">☕</span>
                            <span className="sidebar-title">{shop?.name}</span>
                        </>
                    )}
                </div>

                <nav className="sidebar-nav">
                    <button className={`nav-item ${activeTab === 'items' ? 'active' : ''}`} onClick={() => setActiveTab('items')}>
                        <span className="nav-icon">📋</span> Menu Items
                    </button>
                    <button className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
                        <span className="nav-icon">📁</span> Categories
                    </button>
                    <button className={`nav-item ${activeTab === 'qrcode' ? 'active' : ''}`} onClick={() => setActiveTab('qrcode')}>
                        <span className="nav-icon">📱</span> QR Code
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <button className="nav-item" onClick={() => window.open(`/${shopSlug}`, '_blank')}>
                        <span className="nav-icon">👁️</span> View Menu
                    </button>
                    <button className="nav-item" onClick={handleLogout}>
                        <span className="nav-icon">🚪</span> Logout
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">📋</div>
                        <div className="stat-info">
                            <h3>{menuData.items.length}</h3>
                            <p>Total Items</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📁</div>
                        <div className="stat-info">
                            <h3>{menuData.categories.length}</h3>
                            <p>Categories</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-info">
                            <h3>{menuData.items.filter(i => i.available).length}</h3>
                            <p>Available</p>
                        </div>
                    </div>
                </div>

                {activeTab === 'items' && (
                    <>
                        <div className="page-header">
                            <h1 className="page-title">Menu Items</h1>
                            <button className="btn btn-primary" onClick={() => openItemModal()}>+ Add Item</button>
                        </div>

                        <div className="items-table">
                            <div className="table-header">
                                <span>Item</span><span>Category</span><span>Price</span><span>Status</span><span>Actions</span>
                            </div>
                            {menuData.items.map(item => (
                                <div key={item.id} className="table-row">
                                    <div className="item-info">
                                        <div className="item-thumb" style={item.image ? { backgroundImage: `url(${item.image})`, backgroundSize: 'cover' } : {}}>
                                            {!item.image && getCategoryIcon(item.categoryId)}
                                        </div>
                                        <div>
                                            <div className="item-name">{item.name}</div>
                                            <div className="item-category">{item.description?.slice(0, 30)}...</div>
                                        </div>
                                    </div>
                                    <span>{getCategoryName(item.categoryId)}</span>
                                    <span className="item-price">${parseFloat(item.price).toFixed(2)}</span>
                                    <span>
                                        <span className={`status-badge ${item.available ? 'status-available' : 'status-unavailable'}`}>
                                            {item.available ? 'Available' : 'Unavailable'}
                                        </span>
                                    </span>
                                    <div className="action-buttons">
                                        <button className="btn btn-secondary btn-sm" onClick={() => openItemModal(item)}>✏️</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => deleteItem(item.id)}>🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {activeTab === 'categories' && (
                    <>
                        <div className="page-header">
                            <h1 className="page-title">Categories</h1>
                            <button className="btn btn-primary" onClick={() => openCategoryModal()}>+ Add Category</button>
                        </div>

                        <div className="items-table">
                            <div className="table-header">
                                <span>Category</span><span>Icon</span><span>Items</span><span>Order</span><span>Actions</span>
                            </div>
                            {menuData.categories.sort((a, b) => a.order - b.order).map(cat => (
                                <div key={cat.id} className="table-row">
                                    <div className="item-info">
                                        <div className="item-thumb">{cat.icon}</div>
                                        <div className="item-name">{cat.name}</div>
                                    </div>
                                    <span style={{ fontSize: '1.5rem' }}>{cat.icon}</span>
                                    <span>{menuData.items.filter(i => i.categoryId === cat.id).length} items</span>
                                    <span>#{cat.order}</span>
                                    <div className="action-buttons">
                                        <button className="btn btn-secondary btn-sm" onClick={() => openCategoryModal(cat)}>✏️</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => deleteCategory(cat.id)}>🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {activeTab === 'qrcode' && (
                    <div className="qr-section">
                        <h1 className="page-title">Your Menu QR Code</h1>
                        <p style={{ color: 'var(--text-secondary)', margin: '20px 0' }}>
                            Print this QR code for your tables
                        </p>
                        <div className="qr-container">
                            <QRCodeSVG value={menuUrl} size={250} level="H" includeMargin={true} />
                        </div>
                        <p className="qr-url">Menu URL: {menuUrl}</p>
                        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => window.print()}>
                            🖨️ Print QR Code
                        </button>
                    </div>
                )}
            </main>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingItem ? 'Edit' : 'Add'} {modalType === 'item' ? 'Item' : 'Category'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {modalType === 'item' ? (
                                <>
                                    <div className="input-group">
                                        <label>Name</label>
                                        <input type="text" className="input" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Description</label>
                                        <textarea className="input" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Price ($)</label>
                                        <input type="number" step="0.01" className="input" value={formData.price || ''} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Category</label>
                                        <select className="input" value={formData.categoryId || ''} onChange={e => setFormData({ ...formData, categoryId: e.target.value })}>
                                            {menuData.categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <label>Image</label>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            {formData.image && <img src={formData.image} alt="Preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />}
                                            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                                                {uploading ? '⏳...' : '📷 Upload'}
                                                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading} />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={formData.available !== false} onChange={e => setFormData({ ...formData, available: e.target.checked })} style={{ width: '20px', height: '20px' }} />
                                            Available
                                        </label>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="input-group">
                                        <label>Name</label>
                                        <input type="text" className="input" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label>Icon</label>
                                        <input type="text" className="input" value={formData.icon || ''} onChange={e => setFormData({ ...formData, icon: e.target.value })} />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={modalType === 'item' ? saveItem : saveCategory}>
                                {editingItem ? 'Save' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
