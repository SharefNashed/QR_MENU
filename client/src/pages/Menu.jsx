import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function Menu() {
    const { shopSlug } = useParams();
    const [menuData, setMenuData] = useState({ shop: null, categories: [], items: [] });
    const [activeCategory, setActiveCategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMenu();
    }, [shopSlug]);

    const fetchMenu = async () => {
        try {
            const response = await fetch(`${API_URL}/shops/${shopSlug}/menu`);
            if (!response.ok) {
                throw new Error('Shop not found');
            }
            const data = await response.json();
            setMenuData(data);
            if (data.categories.length > 0) {
                setActiveCategory(data.categories[0].id);
            }
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const filteredItems = menuData.items.filter(
        item => item.categoryId === activeCategory
    );

    const getCategoryIcon = (categoryId) => {
        const category = menuData.categories.find(c => c.id === categoryId);
        return category ? category.icon : '📋';
    };

    if (loading) {
        return (
            <div className="menu-page">
                <div className="loading">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="menu-page">
                <div className="error-container">
                    <h1>😕 Shop Not Found</h1>
                    <p>The coffee shop "{shopSlug}" doesn't exist.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="menu-page">
            {/* Header */}
            <header className="menu-header">
                {menuData.shop?.logo ? (
                    <img src={menuData.shop.logo} alt={menuData.shop.name} className="menu-logo-img" />
                ) : (
                    <>
                        <div className="menu-logo">☕</div>
                        <h1 className="menu-title">{menuData.shop?.name}</h1>
                    </>
                )}
            </header>

            {/* Category Tabs */}
            <nav className="category-tabs">
                {menuData.categories
                    .sort((a, b) => a.order - b.order)
                    .map(category => (
                        <button
                            key={category.id}
                            className={`category-tab ${activeCategory === category.id ? 'active' : ''}`}
                            onClick={() => setActiveCategory(category.id)}
                        >
                            <span className="category-icon">{category.icon}</span>
                            {category.name}
                        </button>
                    ))}
            </nav>

            {/* Menu Items */}
            <div className="menu-items">
                {filteredItems.map((item, index) => (
                    <div
                        key={item.id}
                        className={`menu-item-card fade-in ${!item.available ? 'menu-item-unavailable' : ''}`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <div className="menu-item-image">
                            {item.image ? (
                                <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                getCategoryIcon(item.categoryId)
                            )}
                        </div>
                        <div className="menu-item-content">
                            <div className="menu-item-header">
                                <h3 className="menu-item-name">{item.name}</h3>
                                <span className="menu-item-price">
                                    {menuData.shop?.settings?.currency || '$'}{item.price.toFixed(2)}
                                </span>
                            </div>
                            <p className="menu-item-description">{item.description}</p>
                            {!item.available && (
                                <span className="unavailable-badge">Currently Unavailable</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {filteredItems.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <p>No items in this category yet.</p>
                </div>
            )}
        </div>
    );
}

export default Menu;
