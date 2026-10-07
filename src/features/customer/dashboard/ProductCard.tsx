import React from 'react';
import { Icon } from '@/components/ui/Icon/Icon';
import { inr, productCategoryName, variantStock, type Product } from '../types';

interface Props {
  product: Product;
  storeName?: string;
  wished: boolean;
  busy?: boolean;
  isNew?: boolean;
  onOpen: (p: Product) => void;
  onWish: (p: Product) => void;
  onAdd: (p: Product) => void;
}

export const ProductCard: React.FC<Props> = ({ product: p, storeName, wished, busy, isNew, onOpen, onWish, onAdd }) => {
  const imgs = p.images ?? [];
  const stock = (p.variants ?? []).reduce((sum, v) => sum + variantStock(v), 0);
  const soldOut = (p.variants?.length ?? 0) > 0 && stock <= 0;
  const open = () => onOpen(p);
  return (
    <article className={`product-card ${soldOut ? 'is-soldout' : ''}`}>
      <div className="product-card__img-wrap" onClick={open} role="link" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') open(); }} aria-label={`View ${p.name}`}>
        <img src={imgs[0]?.image_url || '/favicon.svg'} alt={p.name} className="product-card__img" loading="lazy" onError={(e) => { e.currentTarget.src = '/favicon.svg'; }} />
        {imgs[1] && <img src={imgs[1].image_url} alt="" className="product-card__img product-card__img--alt" loading="lazy" />}
        {soldOut ? <span className="product-card__badge product-card__badge--out">SOLD OUT</span> : isNew && <span className="product-card__badge">NEW</span>}
        {!soldOut && stock > 0 && stock <= 5 && <span className="product-card__low">Only {stock} left</span>}
        <button className={`product-card__wish ${wished ? 'is-on' : ''}`} aria-pressed={wished} aria-label={wished ? `Remove ${p.name} from wishlist` : `Save ${p.name}`} onClick={(e) => { e.stopPropagation(); onWish(p); }}><Icon name="heart" size={19} filled={wished} /></button>
        <span className="product-card__quick">View details →</span>
      </div>
      <span className="product-card__category">{storeName ? `${productCategoryName(p) || 'DripNow edit'} · ${storeName}` : productCategoryName(p) || 'DripNow edit'}</span>
      <h3 className="product-card__title"><button onClick={open}>{p.name}</button></h3>
      <div className="product-card__price-row">
        <span className="current-price">{inr(p.base_price)}</span>
        <span className="product-card__fast"><Icon name="bolt" size={12} /> 60 min</span>
      </div>
      <button className="add-cart-btn" aria-label={`Add ${p.name} to bag`} onClick={() => onAdd(p)} disabled={busy || soldOut}>
        {soldOut ? 'Out of stock' : (p.variants?.length ?? 0) > 1 ? 'Select options' : 'Add to bag'} <span>{soldOut ? '' : '+'}</span>
      </button>
    </article>
  );
};
