import React, { useState } from 'react';
import { ProductDTO } from '../../../../shared';

interface StockPanelProps {
  products: ProductDTO[];
  onAdjustStock: (productId: number, delta: number) => void;
  onAddProduct: (nombre: string, precio: number, stock: number) => Promise<any>;
}

function formatPrice(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-AR');
}

export const StockPanel: React.FC<StockPanelProps> = ({
  products,
  onAdjustStock,
  onAddProduct,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newPrecio, setNewPrecio] = useState('');
  const [newStock, setNewStock] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNombre.trim()) return;
    setIsSaving(true);
    await onAddProduct(
      newNombre.trim(),
      parseFloat(newPrecio) || 0,
      parseInt(newStock, 10) || 0
    );
    setNewNombre('');
    setNewPrecio('');
    setNewStock('');
    setShowAddForm(false);
    setIsSaving(false);
  };

  return (
    <div className="stock-panel">
      <div className="stock-intro">
        Esta pestaña es aparte del tablero principal: acá se actualiza qué productos
        hay disponibles para cargar en el consumo de cada habitación (cuánto queda de
        cada uno y el precio), y se pueden agregar productos nuevos. No afecta el
        estado de las habitaciones.
      </div>

      {products.map((prod) => (
        <div key={prod.id} className="stock-row">
          <div>
            <div className="stock-name">{prod.nombre}</div>
            <div className="stock-sub">{formatPrice(prod.precio)} por unidad</div>
          </div>
          <div className="stock-qty">
            <button
              type="button"
              className="stock-btn"
              onClick={() => onAdjustStock(prod.id, -1)}
              aria-label={`Quitar unidad de ${prod.nombre}`}
            >
              &minus;
            </button>
            <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600 }}>
              {prod.stock}
            </span>
            <button
              type="button"
              className="stock-btn"
              onClick={() => onAdjustStock(prod.id, 1)}
              aria-label={`Sumar unidad de ${prod.nombre}`}
            >
              +
            </button>
          </div>
        </div>
      ))}

      <div>
        {!showAddForm ? (
          <button
            type="button"
            className="link-btn"
            onClick={() => setShowAddForm(true)}
          >
            + Agregar producto
          </button>
        ) : (
          <form className="stock-add-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Nombre del producto"
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Precio"
              value={newPrecio}
              onChange={(e) => setNewPrecio(e.target.value)}
              required
              min="0"
            />
            <input
              type="number"
              placeholder="Stock inicial"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              required
              min="0"
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              className="link-btn"
              style={{ marginLeft: '6px' }}
              onClick={() => setShowAddForm(false)}
            >
              Cancelar
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
