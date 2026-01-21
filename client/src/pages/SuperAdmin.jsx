import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function SuperAdmin() {
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingShop, setEditingShop] = useState(null);
    const [formData, setFormData] = useState({});
    const [uploading, setUploading] = useState(false);
    const navigate = useNavigate();

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        if (!token || user.role !== 'super_admin') {
            navigate('/super-admin');
            return;
        }
        fetchShops();
    }, [token, navigate]);

    const fetchShops = async () => {
        try {
            const response = await fetch(`${API_URL}/super-admin/shops`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setShops(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch shops:', error);
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/super-admin');
    };

    // Image upload handler
    const handleLogoUpload = async (e) => {
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
                setFormData({ ...formData, logo: result.url });
            } else {
                alert('Failed to upload image');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const openCreateModal = () => {
        setFormData({
            slug: '',
            name: '',
            logo: '',
            ownerEmail: '',
            ownerName: '',
            ownerPassword: ''
        });
        setShowModal(true);
    };

    const openEditModal = (shop) => {
        setEditingShop(shop);
        setFormData({
            name: shop.name,
            logo: shop.logo || ''
        });
        setShowEditModal(true);
    };

    const createShop = async () => {
        try {
            const response = await fetch(`${API_URL}/super-admin/shops`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                fetchShops();
                setShowModal(false);
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to create shop');
            }
        } catch (error) {
            console.error('Create shop error:', error);
        }
    };

    const updateShop = async () => {
        try {
            const response = await fetch(`${API_URL}/super-admin/shops/${editingShop.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: formData.name,
                    logo: formData.logo
                })
            });

            if (response.ok) {
                fetchShops();
                setShowEditModal(false);
                setEditingShop(null);
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to update shop');
            }
        } catch (error) {
            console.error('Update shop error:', error);
        }
    };

    const toggleShopStatus = async (shopId) => {
        await fetch(`${API_URL}/super-admin/shops/${shopId}/toggle`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchShops();
    };

    const deleteShop = async (shopId) => {
        if (!window.confirm('Delete this shop and ALL its data? This cannot be undone!')) return;

        await fetch(`${API_URL}/super-admin/shops/${shopId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchShops();
    };

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
                    <span className="sidebar-logo">👑</span>
                    <span className="sidebar-title">Super Admin</span>
                </div>

                <nav className="sidebar-nav">
                    <button className="nav-item active">
                        <span className="nav-icon">🏪</span> All Shops
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <button className="nav-item" onClick={handleLogout}>
                        <span className="nav-icon">🚪</span> Logout
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">🏪</div>
                        <div className="stat-info">
                            <h3>{shops.length}</h3>
                            <p>Total Shops</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-info">
                            <h3>{shops.filter(s => s.isActive).length}</h3>
                            <p>Active</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">⏸️</div>
                        <div className="stat-info">
                            <h3>{shops.filter(s => !s.isActive).length}</h3>
                            <p>Inactive</p>
                        </div>
                    </div>
                </div>

                <div className="page-header">
                    <h1 className="page-title">All Coffee Shops</h1>
                    <button className="btn btn-primary" onClick={openCreateModal}>+ Create Shop</button>
                </div>

                <div className="items-table">
                    <div className="table-header">
                        <span>Shop</span>
                        <span>Owner</span>
                        <span>Status</span>
                        <span>Created</span>
                        <span>Actions</span>
                    </div>
                    {shops.map(shop => (
                        <div key={shop.id} className="table-row">
                            <div className="item-info">
                                <div className="item-thumb">
                                    {shop.logo ? (
                                        <img src={shop.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : '☕'}
                                </div>
                                <div>
                                    <div className="item-name">{shop.name}</div>
                                    <div className="item-category">/{shop.slug}</div>
                                </div>
                            </div>
                            <span>{shop.owner?.email || 'No owner'}</span>
                            <span>
                                <span className={`status-badge ${shop.isActive ? 'status-available' : 'status-unavailable'}`}>
                                    {shop.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </span>
                            <span>{new Date(shop.createdAt).toLocaleDateString()}</span>
                            <div className="action-buttons">
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => window.open(`/${shop.slug}`, '_blank')}
                                    title="View Menu"
                                >
                                    👁️
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => openEditModal(shop)}
                                    title="Edit Shop"
                                >
                                    ✏️
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => navigate(`/${shop.slug}/dashboard`)}
                                    title="Manage Menu"
                                >
                                    ⚙️
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => toggleShopStatus(shop.id)}
                                    title="Toggle Status"
                                >
                                    {shop.isActive ? '⏸️' : '▶️'}
                                </button>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => deleteShop(shop.id)}
                                    title="Delete"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                    {shops.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No shops yet. Create your first coffee shop!
                        </div>
                    )}
                </div>
            </main>

            {/* Create Shop Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Create New Shop</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="input-group">
                                <label>Shop Slug (URL)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., coffee-kings"
                                    value={formData.slug || ''}
                                    onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                                />
                                <small style={{ color: 'var(--text-muted)' }}>URL: brifsoft.com/{formData.slug || 'shop-name'}</small>
                            </div>
                            <div className="input-group">
                                <label>Shop Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., Coffee Kings"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Shop Logo</label>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {formData.logo && (
                                        <img
                                            src={formData.logo}
                                            alt="Logo Preview"
                                            style={{
                                                width: '80px',
                                                height: '80px',
                                                objectFit: 'contain',
                                                borderRadius: '8px',
                                                border: '2px solid var(--accent)',
                                                background: 'white',
                                                padding: '4px'
                                            }}
                                        />
                                    )}
                                    <label className="btn btn-secondary" style={{ cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}>
                                        {uploading ? '⏳ Uploading...' : '📷 Upload Logo'}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleLogoUpload}
                                            style={{ display: 'none' }}
                                            disabled={uploading}
                                        />
                                    </label>
                                    {formData.logo && (
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={() => setFormData({ ...formData, logo: '' })}
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            </div>
                            <hr style={{ border: 'none', borderTop: '1px solid var(--bg-light)', margin: '20px 0' }} />
                            <h4 style={{ marginBottom: '15px', color: 'var(--text-secondary)' }}>Owner Account</h4>
                            <div className="input-group">
                                <label>Owner Email</label>
                                <input
                                    type="email"
                                    className="input"
                                    placeholder="owner@example.com"
                                    value={formData.ownerEmail || ''}
                                    onChange={e => setFormData({ ...formData, ownerEmail: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Owner Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="John Doe"
                                    value={formData.ownerName || ''}
                                    onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Owner Password</label>
                                <input
                                    type="password"
                                    className="input"
                                    placeholder="Password for owner login"
                                    value={formData.ownerPassword || ''}
                                    onChange={e => setFormData({ ...formData, ownerPassword: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={createShop}>Create Shop</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Shop Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Edit Shop: {editingShop?.name}</h2>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="input-group">
                                <label>Shop Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g., Coffee Kings"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Shop Logo</label>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {formData.logo && (
                                        <img
                                            src={formData.logo}
                                            alt="Logo Preview"
                                            style={{
                                                width: '100px',
                                                height: '100px',
                                                objectFit: 'contain',
                                                borderRadius: '8px',
                                                border: '2px solid var(--accent)',
                                                background: 'white',
                                                padding: '4px'
                                            }}
                                        />
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label className="btn btn-secondary" style={{ cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}>
                                            {uploading ? '⏳ Uploading...' : '📷 Upload New Logo'}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                style={{ display: 'none' }}
                                                disabled={uploading}
                                            />
                                        </label>
                                        {formData.logo && (
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm"
                                                onClick={() => setFormData({ ...formData, logo: '' })}
                                            >
                                                🗑️ Remove Logo
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={updateShop}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SuperAdmin;
