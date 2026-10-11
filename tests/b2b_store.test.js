const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../src/index');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const QuoteRequest = require('../src/models/QuoteRequest');
const ClientCatalogue = require('../src/models/ClientCatalogue');
const Order = require('../src/models/Order');
const Message = require('../src/models/Message');

let mongoServer;
let clientToken, adminToken;
let clientUser, adminUser;
let stationeryProduct, devPkgProduct, computerProduct;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('B2B Quote-Based E-Commerce Platform Test Suite', () => {

  describe('1. Authentication & Role Management', () => {
    test('Client Registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Accept', 'application/json')
        .send({
          name: 'Alice Client',
          email: 'alice@acmecorp.com',
          password: 'Password123!',
          company: 'Acme Corp',
          phone: '555-1000'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('client');
      expect(res.body.token).toBeDefined();
      clientToken = res.body.token;
      clientUser = res.body.user;
    });

    test('Admin Setup & Login', async () => {
      const admin = new User({
        name: 'Super Admin',
        email: 'admin@nexusb2b.com',
        password: 'AdminPassword123!',
        company: 'Nexus B2B HQ',
        role: 'admin'
      });
      await admin.save();

      const res = await request(app)
        .post('/api/auth/login')
        .set('Accept', 'application/json')
        .send({
          email: 'admin@nexusb2b.com',
          password: 'AdminPassword123!'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.role).toBe('admin');
      expect(res.body.token).toBeDefined();
      adminToken = res.body.token;
      adminUser = res.body.user;
    });
  });

  describe('2. Catalog Management & Price Gating Enforcement', () => {
    test('Admin creates products in Stationery, Dev Packages, Computers', async () => {
      const p1 = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Executive Premium Leather Notebook',
          category: 'Stationery',
          description: 'High quality A5 leather notebook for executives',
          listPrice: 45.00
        });
      expect(p1.statusCode).toBe(201);
      stationeryProduct = p1.body.product;

      const p2 = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Enterprise Portal Development Package',
          category: 'Online Development Packages',
          description: 'Custom React & Node enterprise portal setup',
          listPrice: 5000.00
        });
      expect(p2.statusCode).toBe(201);
      devPkgProduct = p2.body.product;

      const p3 = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Dell UltraSharp Workstation Computer',
          category: 'Computers',
          description: 'High performance CAD & development workstation',
          listPrice: 2200.00
        });
      expect(p3.statusCode).toBe(201);
      computerProduct = p3.body.product;
    });

    test('Unauthenticated user cannot see prices', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      expect(res.body.products).toBeDefined();
      expect(res.body.products.length).toBeGreaterThanOrEqual(3);

      res.body.products.forEach(p => {
        expect(p.hasCustomPrice).toBe(false);
        expect(p.userPrice).toBeNull();
        expect(p.listPrice).toBeUndefined(); // List price hidden from public
        expect(p.priceDisplay).toBe('Request Quote to View Price');
      });
    });

    test('Registered client with NO approved quotes cannot see prices', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${clientToken}`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      res.body.products.forEach(p => {
        expect(p.hasCustomPrice).toBe(false);
        expect(p.userPrice).toBeNull();
        expect(p.listPrice).toBeUndefined();
      });
    });
  });

  describe('3. Quote Request -> Admin Custom Pricing -> Catalogue Loading Pipeline', () => {
    let quoteRequestId;

    test('Client submits Quote Request for Notebook and Dev Package', async () => {
      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${clientToken}`)
        .set('Accept', 'application/json')
        .send({
          items: [
            { productId: stationeryProduct._id, quantity: 50, notes: 'Bulk order for annual conference' },
            { productId: devPkgProduct._id, quantity: 1, notes: 'Custom B2B portal setup' }
          ],
          clientNotes: 'Please provide corporate volume discount'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.quoteRequest).toBeDefined();
      expect(res.body.quoteRequest.status).toBe('Pending');
      quoteRequestId = res.body.quoteRequest._id;
    });

    test('Admin reviews quote and assigns custom prices to client catalogue', async () => {
      const res = await request(app)
        .put(`/api/quotes/${quoteRequestId}/respond`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Accept', 'application/json')
        .send({
          itemPrices: [
            { productId: stationeryProduct._id, price: 30.00 }, // discounted from 45
            { productId: devPkgProduct._id, price: 4200.00 }   // discounted from 5000
          ],
          adminNotes: 'Approved corporate volume pricing',
          status: 'Quoted'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.quote.status).toBe('Quoted');

      // Verify custom catalogue was populated in DB
      const catalogue = await ClientCatalogue.findOne({ client: clientUser.id });
      expect(catalogue).toBeDefined();
      expect(catalogue.items.length).toBe(2);
    });

    test('Client now sees custom prices in Product Catalog & Client Catalogue', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${clientToken}`)
        .set('Accept', 'application/json');

      expect(res.statusCode).toBe(200);
      const quotedNotebook = res.body.products.find(p => p._id === stationeryProduct._id);
      expect(quotedNotebook.hasCustomPrice).toBe(true);
      expect(quotedNotebook.userPrice).toBe(30.00);
      expect(quotedNotebook.priceDisplay).toBe('$30.00');

      const nonQuotedComputer = res.body.products.find(p => p._id === computerProduct._id);
      expect(nonQuotedComputer.hasCustomPrice).toBe(false);
      expect(nonQuotedComputer.userPrice).toBeNull();
    });
  });

  describe('4. Order Placement & Price Enforcement', () => {
    test('Client cannot order unquoted product', async () => {
      const res = await request(app)
        .post('/api/cart-orders/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .set('Accept', 'application/json')
        .send({
          items: [{ productId: computerProduct._id, quantity: 1 }]
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('does not have an approved quote price');
    });

    test('Client places order for quoted items using approved catalogue pricing', async () => {
      const res = await request(app)
        .post('/api/cart-orders/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .set('Accept', 'application/json')
        .send({
          items: [
            { productId: stationeryProduct._id, quantity: 10 }, // 10 * $30 = $300
            { productId: devPkgProduct._id, quantity: 1 }      // 1 * $4200 = $4200
          ]
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.order).toBeDefined();
      expect(res.body.order.totalAmount).toBe(4500.00);
      expect(res.body.order.status).toBe('Pending');
    });
  });

  describe('5. In-App Client Portal Messaging / Live Chat', () => {
    test('Client sends message to seller support', async () => {
      const res = await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${clientToken}`)
        .set('Accept', 'application/json')
        .send({
          content: 'Hello, can you give an update on our order shipping schedule?'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.message.content).toContain('update on our order shipping schedule');
    });

    test('Admin fetches client chat threads and sends reply', async () => {
      const threadRes = await request(app)
        .get('/api/messages/admin/threads')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Accept', 'application/json');

      expect(threadRes.statusCode).toBe(200);
      expect(threadRes.body.threads.length).toBeGreaterThan(0);

      const replyRes = await request(app)
        .post('/api/messages/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Accept', 'application/json')
        .send({
          clientId: clientUser.id,
          content: 'Hello Alice! Your order is currently being processed and will ship tomorrow.'
        });

      expect(replyRes.statusCode).toBe(201);

      // Verify message thread for client
      const chatRes = await request(app)
        .get('/api/messages/thread')
        .set('Authorization', `Bearer ${clientToken}`)
        .set('Accept', 'application/json');

      expect(chatRes.statusCode).toBe(200);
      expect(chatRes.body.messages.length).toBeGreaterThanOrEqual(2);
    });
  });

});
