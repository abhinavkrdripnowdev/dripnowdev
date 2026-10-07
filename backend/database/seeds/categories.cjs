// Idempotent catalog seed. No default passwords or privileged accounts.
const { db } = require('../../dist/config/database');

const slugify = (v) => v.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const TREE = {
  Women: ['Tops', 'Dresses', 'Jeans & Trousers', 'Co-ords', 'Jumpsuits', 'Athleisure', 'Sleepwear', 'Innerwear'],
  Men: ['T-shirts', 'Shirts', 'Jeans & Trousers', 'Shorts', 'Athleisure', 'Sleepwear', 'Innerwear'],
  Ethnic: ['Kurtas & Sets', 'Sarees', 'Lehengas', 'Nehru Jackets', 'Ethnic Bottoms'],
  Beauty: ['Skincare', 'Makeup', 'Haircare', 'Fragrances'],
  Accessories: ['Bags', 'Watches', 'Sunglasses', 'Belts & Wallets', 'Caps & Hats'],
  Footwear: ['Sneakers', 'Heels', 'Flats & Sandals', 'Formal Shoes', 'Sports Shoes'],
  Home: ['Bedding', 'Decor', 'Kitchen & Dining', 'Storage'],
  Jewellery: ['Earrings', 'Necklaces', 'Rings', 'Bracelets'],
  Gifting: ['Gift Sets', 'Personalised', 'Hampers'],
};

(async () => {
  // Legacy flat categories kept for existing products
  for (const name of ['Fashion', 'Electronics']) {
    await db('categories').insert({ name, slug: slugify(name) }).onConflict('slug').ignore();
  }
  for (const [parent, children] of Object.entries(TREE)) {
    const pslug = slugify(parent);
    await db('categories').insert({ name: parent, slug: pslug }).onConflict('slug').ignore();
    const row = await db('categories').where({ slug: pslug }).first();
    for (const child of children) {
      await db('categories').insert({ name: child, slug: `${pslug}-${slugify(child)}`, parent_id: row.id }).onConflict('slug').ignore();
    }
  }
  console.log('Categories seeded');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.destroy());
