export const API_URL = 'http://localhost:4000/api';
export const UPLOADS_URL = 'http://localhost:4000/uploads';

export function profileImg(file?: string): string {
  return `${UPLOADS_URL}/profiles/${file || 'default_profile_image.jpg'}`;
}
export function productImg(file?: string): string {
  return `${UPLOADS_URL}/products/${file || 'default_product.jpg'}`;
}
export function printImg(file?: string): string {
  return `${UPLOADS_URL}/prints/${file}`;
}
