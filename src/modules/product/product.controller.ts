import { Request, Response } from 'express';
import { sendSuccess, sendError, sendNotFound, sendBadRequest } from '../../utils/response';
import * as productService from './product.service';
import * as sellerService from '../seller/seller.service';

// ─── Categories ─────────────────────────────────────────────────────────────

export async function createCategory(req: Request, res: Response): Promise<void> {
  try {
    const category = await productService.createCategory(req.body);
    sendSuccess(res, category, 'Category created successfully', 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to create category');
  }
}

export async function listCategories(req: Request, res: Response): Promise<void> {
  try {
    const categories = await productService.listCategories();
    sendSuccess(res, categories);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch categories');
  }
}

// ─── Products ───────────────────────────────────────────────────────────────

export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const seller = await sellerService.getSellerProfileByUserId(userId);
    if (!seller || seller.status !== 'approved') {
      sendBadRequest(res, 'Only approved sellers can list products');
      return;
    }

    const product = await productService.createProduct(seller.id, req.body);
    sendSuccess(res, product, 'Product created successfully', 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to create product');
  }
}

export async function getSellerProducts(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const seller = await sellerService.getSellerProfileByUserId(userId);
    if (!seller) {
      sendNotFound(res, 'Seller profile not found');
      return;
    }

    const products = await productService.listProductsBySeller(seller.id);
    sendSuccess(res, products);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch seller products');
  }
}

export async function getPublicProducts(req: Request, res: Response): Promise<void> {
  try {
    const categoryId = req.query.category_id ? Number(req.query.category_id) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const minPrice = req.query.min_price ? Number(req.query.min_price) : undefined;
    const maxPrice = req.query.max_price ? Number(req.query.max_price) : undefined;
    const size = req.query.size ? String(req.query.size) : undefined;
    const color = req.query.color ? String(req.query.color) : undefined;
    const sort = req.query.sort as any;

    const products = await productService.listPublicProducts({
      category_id: categoryId,
      search,
      min_price: minPrice,
      max_price: maxPrice,
      size,
      color,
      sort,
    });
    sendSuccess(res, products);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch products');
  }
}

export async function getProductById(req: Request, res: Response): Promise<void> {
  try {
    const productId = req.params.id as string;
    const product = await productService.getProductById(productId);
    if (!product) {
      sendNotFound(res, 'Product not found');
      return;
    }
    sendSuccess(res, product);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch product details');
  }
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const seller = await sellerService.getSellerProfileByUserId(userId);
    if (!seller) {
      sendNotFound(res, 'Seller profile not found');
      return;
    }

    const productId = req.params.id as string;
    const product = await productService.updateProduct(productId, seller.id, req.body);
    sendSuccess(res, product, 'Product updated successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update product');
  }
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const seller = await sellerService.getSellerProfileByUserId(userId);
    if (!seller) {
      sendNotFound(res, 'Seller profile not found');
      return;
    }

    const productId = req.params.id as string;
    await productService.deleteProduct(productId, seller.id);
    sendSuccess(res, null, 'Product deleted successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to delete product');
  }
}

// ─── Variants & Inventory ───────────────────────────────────────────────────

export async function addVariant(req: Request, res: Response): Promise<void> {
  try {
    const productId = req.params.id as string;
    const variant = await productService.addProductVariant(productId, req.body);
    sendSuccess(res, variant, 'Variant added successfully', 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to add variant');
  }
}

export async function updateInventory(req: Request, res: Response): Promise<void> {
  try {
    const variantId = req.params.variantId as string;
    const inventory = await productService.updateInventory(variantId, req.body);
    sendSuccess(res, inventory, 'Inventory updated successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to update inventory');
  }
}

export async function addProductImage(req: Request, res: Response): Promise<void> {
  try {
    const productId = req.params.id as string;
    const { image_url, is_primary } = req.body;
    const image = await productService.addProductImage(productId, image_url, is_primary);
    sendSuccess(res, image, 'Image added successfully', 201);
  } catch (error: any) {
    sendError(res, error.message || 'Failed to add image');
  }
}
